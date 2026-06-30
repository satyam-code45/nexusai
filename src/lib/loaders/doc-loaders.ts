
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text"
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { cloudinary } from "@/lib/cloudinary";

// Resolve a Cloudinary raw URL to a signed download URL so authenticated
// resources can be fetched server-side without a 401.
function resolveCloudinaryUrl(url: string): string {
  if (!url.startsWith("https://res.cloudinary.com/")) return url;
  const typeMatch = url.match(/\/raw\/(upload|authenticated)\//);
  const deliveryType = typeMatch?.[1] ?? "upload";
  const match = url.match(/\/raw\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
  if (!match) return url;
  const publicId = match[1];
  return (cloudinary.utils as any).private_download_url(publicId, "", {
    resource_type: "raw",
    type: deliveryType,
  });
}

export async function splitDocToChunks(docs: Document<Record<string, any>>[], props: { chunkSize: number, chunkOverlap: number }) {
  const splitter = new RecursiveCharacterTextSplitter({ ...props });
  const splitDocs = await splitter.splitDocuments(docs);
  return splitDocs
}


// Detect Next.js RSC flight payloads — these are JS blobs, not readable content.
function isRscPayload(text: string): boolean {
  const markers = ['self.__next_f', '__next_f.push', '"$Sreact.fragment"', '"$Sreact.'];
  return markers.filter((m) => text.includes(m)).length >= 2;
}

export async function loadWeb(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const contentSelectors = [
      "article",
      "main",
      '[role="main"]',
      ".post-content, .entry-content, .article-body, .article-content",
      "body",
    ];

    const fetcher = (u: string, init?: any) =>
      fetch(u, {
        ...init,
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusAI-Scraper/1.0)" },
      });

    for (const selector of contentSelectors) {
      const loader = new CheerioWebBaseLoader(url, { selector, fetch: fetcher } as any);
      const docs = await loader.load();
      const text = docs.map((d) => d.pageContent).join(" ").trim();
      if (text.length > 200 && !isRscPayload(text)) return docs;
    }

    throw new Error(
      "Could not extract meaningful content from this URL. The page may require JavaScript or is a Next.js RSC-rendered app.",
    );
  } finally {
    clearTimeout(timeout);
  }
}


export async function loadPDF(filePath: string) {
  const { PDFParse } = await import("pdf-parse");
  const buffer = await fs.readFile(filePath);
  const parser = new (PDFParse as any)({ data: buffer });
  const result = await parser.getText();
  return [new Document({ pageContent: result.text, metadata: { source: filePath } })];
}


export async function loadText(filePath: string) {
  const loader = new TextLoader(filePath);
  const docs = await loader.load();
  return docs
}


export async function loadDocx(filePath: string) {
  const loader = new DocxLoader(filePath);
  const docs = await loader.load();
  return docs
}


export async function loadDoc(filePath: string) {
  const loader = new DocxLoader(filePath, { type: "doc" });
  const docs = await loader.load();
  return docs
}

export async function loadPptx(filePath: string) {
  const loader = new PPTXLoader(filePath);
  const docs = await loader.load();
  return docs
}


export async function loadDocumentFromBuffer(
  buffer: Buffer,
  ext: string,
): Promise<Document[]> {
  const tmpFile = path.join(
    os.tmpdir(),
    `nexusai-${Date.now()}-${randomUUID()}.${ext.toLowerCase()}`,
  );
  await fs.writeFile(tmpFile, buffer);
  try {
    switch (ext.toLowerCase()) {
      case "pdf":
        return await loadPDF(tmpFile);
      case "docx":
        return await loadDocx(tmpFile);
      case "doc":
        return await loadDoc(tmpFile);
      case "pptx":
      case "ppt":
      case "ppsx":
      case "pptm":
        return await loadPptx(tmpFile);
      case "txt":
        return await loadText(tmpFile);
      default:
        throw new Error(`Unsupported file type: .${ext}`);
    }
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

async function loadDocumentFromUrl(
  url: string,
  chunkSize: number,
  chunkOverlap: number
) {
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath).replace(".", "").trim().toLowerCase();

  const fetchUrl = resolveCloudinaryUrl(url);
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document from ${url} (${response.status})`);
  }

  // Plain text: no temp file needed
  if (ext === "txt" || ext === "") {
    const text = await response.text();
    const docs = [new Document({ pageContent: text, metadata: { source: url } })];
    return splitDocToChunks(docs, { chunkSize, chunkOverlap });
  }

  // Binary formats: download to temp file, process, then clean up
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tmpFile = path.join(os.tmpdir(), `nexusai-${Date.now()}-${randomUUID()}.${ext}`);

  await fs.writeFile(tmpFile, buffer);

  try {
    let docs: Document[];
    switch (ext) {
      case "pdf":
        docs = await loadPDF(tmpFile);
        break;
      case "docx":
        docs = await loadDocx(tmpFile);
        break;
      case "doc":
        docs = await loadDoc(tmpFile);
        break;
      case "pptx":
      case "ppt":
      case "ppsx":
      case "pptm":
        docs = await loadPptx(tmpFile);
        break;
      default:
        throw new Error(`Unsupported file type from URL: .${ext}`);
    }
    return splitDocToChunks(docs, { chunkSize, chunkOverlap });
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}


/**
 * Sources stored in MongoDB (pasted text, YouTube transcripts, web-scrapes) use
 * `/api/sources/{id}/content` as their fileUrl — a route that requires auth and
 * has no file extension, so `loadDocument` throws "Unsupported file".
 * Use this helper instead: it reads `content` directly from the DB record when
 * present, and falls back to `loadDocument` for Cloudinary-hosted binary files.
 */
export async function loadDocumentOrContent(
  fileUrl: string,
  content: string | null | undefined,
  chunkSize: number,
  chunkOverlap: number,
): Promise<Document[]> {
  if (content) {
    const rawDocs = [new Document({ pageContent: content, metadata: { source: fileUrl } })];
    return splitDocToChunks(rawDocs, { chunkSize, chunkOverlap });
  }
  return loadDocument(fileUrl, chunkSize, chunkOverlap);
}

export async function loadDocument(
  filePath: string,
  chunkSize = 1000,
  chunkOverlap = 200
) {
  // Delegate HTTP/HTTPS URLs to the URL-based loader
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return loadDocumentFromUrl(filePath, chunkSize, chunkOverlap);
  }

  const extentionWithoutDot = path.extname(filePath).replace('.', ' ')
  let docs: any = null;

  switch (extentionWithoutDot.trim()) {
    case 'pdf':
      docs = await loadPDF(filePath);
      break;
    case 'docx':
      docs = await loadDocx(filePath);
      break;
    case 'doc':
      docs = await loadDoc(filePath);
      break;
    case 'pptx':
    case 'ppt':
    case 'ppsx':
    case 'pptm':
      docs = await loadPptx(filePath);
      break;
    case 'html':
      docs = await loadWeb(filePath);
      break;
    case 'txt':
      docs = await loadText(filePath);
      break;
    default:
      throw new Error(`Unsupported file ${filePath}`);
  }

  return splitDocToChunks(docs, { chunkSize, chunkOverlap });
}
