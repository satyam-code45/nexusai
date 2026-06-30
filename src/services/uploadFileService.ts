import path from "path";
import { randomUUID } from "crypto";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "@/lib/uploadToCloudinary";

export class uploadFileService {
  private static instance: uploadFileService;

  public static getInstance(): uploadFileService {
    if (!uploadFileService.instance) {
      uploadFileService.instance = new uploadFileService();
    }
    return uploadFileService.instance;
  }

  async uploadFile(file: File) {
    if (!file || file.size === 0) throw new Error("No file uploaded");

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum allowed size is 50 MB.`);
    }

    const allowedExtensions = [".pdf", ".txt", ".docx", ".pptx", ".doc"];
    const parsedName = path.parse(file.name);
    const extension = parsedName.ext.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw new Error(
        `Only files with the following extensions are allowed: ${allowedExtensions.join(", ")}`
      );
    }

    const safeBaseName =
      parsedName.name.replace(/[^a-zA-Z0-9-_]/g, "_") || "file";
    const uniqueName = `${safeBaseName}-${Date.now()}-${randomUUID()}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { url: fileUrl } = await uploadBufferToCloudinary(buffer, {
      publicId: uniqueName,
      resourceType: "raw",
      folder: "nexusai/uploads",
    });

    return {
      fileUrl,
      fileSize: file.size,
      name: uniqueName,
    };
  }

  async removeStoredFile(fileUrl?: string) {
    if (!fileUrl) return;
    await deleteFromCloudinary(fileUrl, "raw");
  }
}
