import { cloudinary } from "./cloudinary";

type ResourceType = "raw" | "image" | "video" | "auto";

type UploadOptions = {
  folder?: string;
  publicId?: string;
  resourceType?: ResourceType;
};

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<{ url: string; publicId: string }> {
  const {
    folder = "nexusai/uploads",
    publicId,
    resourceType = "raw",
  } = options;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(publicId && { public_id: publicId }),
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    ).end(buffer);
  });
}

export async function deleteFromCloudinary(
  fileUrl: string,
  resourceType: ResourceType = "raw"
): Promise<void> {
  if (!fileUrl) return;

  const publicId = extractPublicId(fileUrl, resourceType);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`Cloudinary delete failed for ${publicId}: ${(err as Error).message}`);
  }
}

function extractPublicId(url: string, resourceType: ResourceType): string | null {
  if (!url.startsWith("https://res.cloudinary.com")) return null;

  // URL format: https://res.cloudinary.com/{cloud}/{type}/upload/v{version}/{public_id}
  // For raw: public_id includes extension (e.g. nexusai/uploads/file.pdf)
  // For image: public_id excludes extension (e.g. nexusai/images/file)
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;

  let publicId = match[1];

  // Strip extension for image/video resources
  if (resourceType === "image" || resourceType === "video") {
    publicId = publicId.replace(/\.[^/.]+$/, "");
  }

  return publicId;
}
