import { randomUUID } from "crypto";
import path from "path";
import { uploadBufferToCloudinary } from "@/lib/uploadToCloudinary";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export async function uploadImage(file: File) {
  if (!file || file.size === 0) throw new Error("No file uploaded");

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only image files are allowed");
  }

  const parsedName = path.parse(file.name);
  const safeBaseName =
    parsedName.name.replace(/[^a-zA-Z0-9-_]/g, "_") || "image";
  const uniqueId = `${safeBaseName}-${Date.now()}-${randomUUID()}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { url: fileUrl } = await uploadBufferToCloudinary(buffer, {
    publicId: uniqueId,
    resourceType: "image",
    folder: "nexusai/images",
  });

  return {
    fileUrl,
    fileSize: file.size,
    name: file.name,
  };
}
