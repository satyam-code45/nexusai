import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { uploadBufferToCloudinary } from "@/lib/uploadToCloudinary";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

// Cloudinary video uploads are chunked so 200 MB is fine in practice;
// for Vercel Hobby (4.5 MB serverless body limit) use direct browser upload instead.
export const maxDuration = 60;

export const POST = withAuth(async (req: Request) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A video file is required" }, { status: 400 });
  }

  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported video format. Use mp4, webm, ogg, mov, or avi." }, { status: 400 });
  }

  const parsedName = path.parse(file.name);
  const safeBaseName = parsedName.name.replace(/[^a-zA-Z0-9-_]/g, "_") || "video";
  const uniqueId = `${safeBaseName}-${Date.now()}-${randomUUID()}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { url: fileUrl } = await uploadBufferToCloudinary(buffer, {
    publicId: uniqueId,
    resourceType: "video",
    folder: "nexusai/videos",
  });

  return NextResponse.json(
    { message: "Video uploaded successfully", video: { fileUrl } },
    { status: 201 }
  );
});
