import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";

import "dotenv/config";
import { loadDocument } from "../loaders/doc-loaders";

// Strip null bytes and other control characters that cause OpenAI embedding API rejections.
function sanitize(text: string): string {
  return text.replace(/\x00/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

async function loadRawDocs(props: {
  urls?: string[];
  rawTexts?: string[];
  fileUrl?: string;
  userId: string;
  projectId: string;
}) {
  const { urls = [], rawTexts = [], fileUrl, userId, projectId } = props;
  const docs: Document[] = [];

  // Load from URLs (PDFs, Drive files, etc.)
  if (urls.length > 0) {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const loaded = await loadDocument(url);
        return loaded.map((doc) => {
          doc.pageContent = sanitize(doc.pageContent);
          doc.metadata.originalUrl = url;
          doc.metadata.source = url;
          doc.metadata.userId = userId;
          doc.metadata.projectId = projectId;
          return doc;
        });
      }),
    );
    const successful = results
      .filter(
        (r): r is PromiseFulfilledResult<Document[]> => r.status === "fulfilled",
      )
      .flatMap((r) => r.value);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(
        "Some document loads failed:",
        failed.map((r) => (r as PromiseRejectedResult).reason?.message),
      );
    }
    docs.push(...successful);
  }

  // Load from pre-extracted text (youtube transcripts, web content, pasted text)
  for (const text of rawTexts) {
    const clean = sanitize(text ?? "");
    if (clean) {
      docs.push(new Document({
        pageContent: clean,
        // originalUrl must match the KnowledgeBase.fileUrl so source-filtered queries work
        metadata: { source: fileUrl ?? "db", originalUrl: fileUrl ?? "", userId, projectId },
      }));
    }
  }

  return docs;
}

async function createParentDocs(props: {
  rawDocs: Document[];
  userId: string;
  projectId: string;
}) {
  const { rawDocs, userId, projectId } = props;
  const parentSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const parentSplits = await parentSplitter.splitDocuments(rawDocs);

  return parentSplits.map((split) => {
    const chunkId = uuidv4(); // UNIQUE ID per chunk
    split.metadata.docType = "parent";
    split.metadata.chunkId = chunkId;
    split.metadata.parentId = chunkId; // Self-reference
    split.metadata.source = chunkId;
    split.metadata.userId = userId;
    split.metadata.projectId = projectId;

    return split;
  });
}

async function createChildDocs(props: {
  parentDocs: Document[];
  userId: string;
  projectId: string;
}) {
  const { parentDocs, userId, projectId } = props;
  const childSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
  });

  // Split each parent independently so we know exactly which parent each child belongs to.
  // The old Math.floor(i/4) heuristic assumed exactly 4 children per parent, which is wrong.
  const allChildren: Document[] = [];
  let globalIdx = 0;

  for (const parentDoc of parentDocs) {
    const children = await childSplitter.splitDocuments([parentDoc]);
    for (const split of children) {
      split.metadata.docType = "child";
      split.metadata.parentId = parentDoc.metadata.chunkId;
      split.metadata.chunkId = `child-${parentDoc.metadata.chunkId}-${globalIdx}`;
      split.metadata.source = split.metadata.chunkId;
      split.metadata.userId = userId;
      split.metadata.projectId = projectId;
      allChildren.push(split);
      globalIdx++;
    }
  }

  return allChildren;
}

export async function docEmbeddingMultiVector(props: {
  urls?: string[];
  rawTexts?: string[];
  fileUrl?: string;
  userId: string;
  projectId: string;
}) {
  const { urls, rawTexts, fileUrl, userId, projectId } = props;
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pinecone = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

  console.log("🔄 Loading raw documents...");
  const rawDocs = await loadRawDocs({ urls, rawTexts, fileUrl, userId, projectId });

  console.log("🔄 Creating parent chunks...");
  const parentDocs = await createParentDocs({ rawDocs, userId, projectId });
  console.log("parentDoc   : ", parentDocs);

  console.log("🔄 Creating child chunks...");
  const childDocs = await createChildDocs({ parentDocs, userId, projectId });

  const allDocs = [...parentDocs, ...childDocs];
  if (allDocs.length === 0) {
    console.log("⚠️ No documents to embed — skipping Pinecone upsert");
    return;
  }

  console.log(`📝 allDocs: ${allDocs.length} (${parentDocs.length} parent + ${childDocs.length} child)`);

  // Embed all texts directly — bypasses PineconeStore's internal batching which can silently
  // swallow OpenAI errors and return an empty vector array (→ PineconeArgumentError downstream).
  console.log("🔤 Embedding all documents...");
  const allTexts = allDocs.map((d) => d.pageContent);
  const allVectors = await embeddings.embedDocuments(allTexts);
  console.log(`✅ Got ${allVectors.length} vectors (dim=${allVectors[0]?.length ?? 0})`);

  if (allVectors.length !== allDocs.length) {
    throw new Error(
      `Embedding count mismatch: ${allVectors.length} vectors for ${allDocs.length} docs`,
    );
  }

  // Build Pinecone records with flat metadata (no nested objects — Pinecone rejects them).
  // Include 'text' key so PineconeStore.similaritySearch can reconstruct pageContent on query.
  const records = allDocs.map((doc, i) => ({
    id: doc.metadata.chunkId as string,
    values: allVectors[i],
    metadata: {
      docType:     doc.metadata.docType as string,
      chunkId:     doc.metadata.chunkId as string,
      parentId:    doc.metadata.parentId as string,
      source:      doc.metadata.source as string,
      originalUrl: doc.metadata.originalUrl as string,
      userId:      doc.metadata.userId as string,
      projectId:   doc.metadata.projectId as string,
      text:        doc.pageContent,
    },
  }));

  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await pineconeIndex.upsert({ records: batch });
    console.log(`📤 Upserted ${i + batch.length}/${records.length}`);
  }

  console.log(`✅ Stored ${parentDocs.length} parent + ${childDocs.length} child chunks`);
}

export async function queryMultiVector(props: {
  userId: string;
  projectId: string;
  query: string;
  docUrl?: string;
  docUrls?: string[];
}) {
  const { userId, query, projectId, docUrl, docUrls } = props;
  // Merge single docUrl + docUrls array into one list for the filter
  const urlFilter = [
    ...(docUrls ?? []),
    ...(docUrl ? [docUrl] : []),
  ].filter(Boolean);
  const kParents = 3;
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pinecone = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });

  // STEP 1: Child docs — scoped by projectId only so room members can query
  // each other's documents (vectors are stored per-uploader userId but projectId
  // is the correct collaboration boundary).
  const childFilter: Record<string, any> = {
    docType: "child",
    projectId,
  };
  if (urlFilter.length === 1) childFilter.originalUrl = urlFilter[0];
  else if (urlFilter.length > 1) childFilter.originalUrl = { $in: urlFilter };
  const childDocs = await vectorStore.similaritySearch(query, 10, childFilter);

  console.log(`[queryMultiVector] childDocs: ${childDocs.length}, urlFilter: ${JSON.stringify(urlFilter)}`);

  // Build the parent filter — scoped by projectId only (same reason as above)
  const parentFilter: Record<string, any> = {
    docType: "parent",
    projectId,
  };
  if (urlFilter.length === 1) parentFilter.originalUrl = urlFilter[0];
  else if (urlFilter.length > 1) parentFilter.originalUrl = { $in: urlFilter };

  // When children were found, narrow to their exact parent chunks.
  // When child search returns nothing (index not ready, URL edge case), fall
  // back to a pure similarity search scoped only by userId/projectId/originalUrl.
  if (childDocs.length > 0) {
    const parentChunkIds = [...new Set(childDocs.map((c) => c.metadata.parentId))];
    parentFilter.source = { $in: parentChunkIds };
  }

  const parentDocs = await vectorStore.similaritySearch(query, kParents, parentFilter);
  console.log(`[queryMultiVector] parentDocs: ${parentDocs.length}`);

  return {
    query,
    retrievedDocs: parentDocs,
  };
}

// await docEmbeddingMultiVector(['https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/']);
// const results = await queryMultiVector("prompt engineering");
// console.log(results.parentDocs.length); // Should be 3

// const results = await queryMultiVector("Types of prompt engineering");
// const results = await queryMultiVector("List all prompt engineering methods like zero-shot prompting, few-shot learning, chain-of-thought CoT, self-consistency, Tree of Thoughts, and instruction tuning?");
// console.log('results   : ', results)
// console.log("Parent chunks:", results.parentDocs.map(d => d.pageContent.slice(0, 200)));
// console.log("Child matches:", results.childMatches);
