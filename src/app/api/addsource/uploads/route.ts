import { NextResponse } from "next/server";
import path from "path";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { loadDocumentFromBuffer } from "@/lib/loaders/doc-loaders";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { getDocChunk } from "@/lib/helper/getDocChunk";
import { uploadFileService } from "@/services/uploadFileService";
import { agenda } from "@/lib/agenda/agenda";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const POST = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const formData = await req.formData();
  const file = formData.get("file");
  const projectId = formData.get("projectId") as string;

  if (!projectId) {
    return NextResponse.json({ message: "Missing projectId" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "A file is required" }, { status: 400 });
  }

  // Read buffer once — used for local text extraction AND Cloudinary upload
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const uploadService = uploadFileService.getInstance();
  const { fileUrl, name: fileName } = await uploadService.uploadFile(file);

  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  const source_type = ext;

  // Extract text locally from buffer — avoids re-fetching from Cloudinary (which may 401)
  let extractedText = "";
  let title = path.parse(fileName).name.replace(/[-_]+/g, " ").trim() || fileName;
  try {
    const llm = utilityModel;
    const docSplit = await loadDocumentFromBuffer(fileBuffer, ext);
    extractedText = docSplit.map((d) => d.pageContent).join("\n\n");
    const firstChunk = getDocChunk(docSplit);
    title = await generateTitle(llm, firstChunk);
  } catch (err) {
    console.error("[upload] title generation failed, using filename as title:", err);
  }

  const docRepo = KnowLedgeBaseService.getInstance();
  let newDoc;
  try {
    newDoc = await docRepo.createDoc({ fileName, fileUrl, userId, title, projectId, source_type });
  } catch (err) {
    await uploadService.removeStoredFile(fileUrl).catch(() => {});
    throw err;
  }

  if (!extractedText) {
    console.warn("⚠️ No text extracted from file, skipping embedding:", fileUrl);
    await docRepo.setEmbeddingStatus({
      docId: String(newDoc._id),
      status: "failed",
      error: "No text could be extracted from this file",
    });
  } else {
    // Embed the already-extracted text directly rather than passing the Cloudinary
    // URL — avoids the job having to re-fetch the file (which may 401).
    await agenda.now("docEmbedding", { docId: String(newDoc._id), content: extractedText, userId, projectId });
  }

  return NextResponse.json({ message: "Document uploaded successfully" }, { status: 200 });
});
