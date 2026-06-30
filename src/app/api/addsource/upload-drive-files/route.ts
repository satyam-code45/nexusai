import { NextResponse } from "next/server";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { agenda } from "@/lib/agenda/agenda";
import { loadDocument } from "@/lib/loaders/doc-loaders";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { getDocChunk } from "@/lib/helper/getDocChunk";
import { google } from "googleapis";
import { generateFileName, getFileExtension } from "@/lib/utils";
import { getSession } from "@/lib/auth/getSession";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { uploadBufferToCloudinary } from "@/lib/uploadToCloudinary";
import os from "os";
import path from "path";
import fs from "fs/promises";

// Helper to map Google MimeTypes to Export MimeTypes
const GOOGLE_MIME_MAP: Record<string, string> = {
    "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXPORT_EXT_MAP: Record<string, string> = {
    "application/vnd.google-apps.document": ".docx",
    "application/vnd.google-apps.spreadsheet": ".xlsx",
    "application/vnd.google-apps.presentation": ".pptx",
};

export const POST = withAuth(async (req: Request) => {
    try {
        const { userId, projectId, fileId } = await req.json();

        if (!userId || !projectId) {
            return NextResponse.json(
                { message: "Missing userId or projectId" },
                { status: 400 }
            );
        }

        const authSession = await getServerSession(authOptions);
        if (authSession?.user?.id !== userId) {
            return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const session = await getSession();
        const accessToken = session?.user?.access_token ?? "";
        const refreshToken = session?.user?.refresh_token ?? "";

        const oauth2Client = new google.auth.OAuth2({
            client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
            client_id: process.env.GOOGLE_CLIENT_ID as string,
        });
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // 1. Get file metadata
        const metadata = await drive.files.get({ fileId, fields: "id, name, mimeType" });

        const mimeType = metadata.data.mimeType || "";
        let originalName = metadata.data.name || "file";
        let response;

        // 2. Decide between 'get' (binary) or 'export' (Google Docs)
        const exportMimeType = GOOGLE_MIME_MAP[mimeType];

        if (exportMimeType) {
            response = await drive.files.export(
                { fileId, mimeType: exportMimeType },
                { responseType: "stream" }
            );
            const ext = EXPORT_EXT_MAP[mimeType];
            if (!originalName.endsWith(ext)) originalName += ext;
        } else {
            response = await drive.files.get(
                { fileId, alt: "media" },
                { responseType: "stream" }
            );
        }

        // 3. Buffer the stream
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            response.data
                .on("data", (chunk: Buffer) => chunks.push(chunk))
                .on("end", () => resolve())
                .on("error", (err: Error) => reject(err));
        });
        const buffer = Buffer.concat(chunks);

        const newFileName = generateFileName(originalName);
        const fileExtension = getFileExtension(newFileName);

        // 4. Upload buffer to Cloudinary
        const { url: fileUrl } = await uploadBufferToCloudinary(buffer, {
            publicId: newFileName,
            resourceType: "raw",
            folder: "nexusai/uploads",
        });

        // 5. Load document to extract title — write to temp file for binary formats
        const ext = path.extname(newFileName).replace(".", "").toLowerCase();
        let docSplit;
        if (["pdf", "docx", "doc"].includes(ext)) {
            const tmpFile = path.join(os.tmpdir(), `nexusai-drive-${Date.now()}.${ext}`);
            await fs.writeFile(tmpFile, buffer);
            try {
                docSplit = await loadDocument(tmpFile);
            } finally {
                await fs.unlink(tmpFile).catch(() => {});
            }
        } else {
            docSplit = await loadDocument(fileUrl);
        }

        const firstChunk = getDocChunk(docSplit);
        const llm = utilityModel;
        const title = await generateTitle(llm, firstChunk);

        const docRepo = KnowLedgeBaseService.getInstance();
        await docRepo.createDoc({
            fileName: newFileName,
            fileUrl,
            userId: String(userId),
            projectId,
            title,
            source_type: fileExtension,
        });

        agenda.now("docEmbedding", { projectId, userId, filePath: fileUrl });

        return NextResponse.json({ message: "File uploaded successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("Upload Error:", error);

        if (error.code === 403 || error.code === 401) {
            return NextResponse.json({ message: "Google Drive Permission Error", error: error.message }, { status: error.code });
        }

        return NextResponse.json(
            { message: "Internal server error", error: String(error) },
            { status: 500 }
        );
    }
});
