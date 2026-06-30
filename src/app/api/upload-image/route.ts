import { NextResponse } from "next/server";
import { uploadImage } from "./upload-image";
import { withAuth } from "@/lib/mongodb/withAuth";

export const POST = withAuth(async (req: Request) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "An image file is required" },
      { status: 400 }
    );
  }


  try {
    const image = await uploadImage(file);
    return NextResponse.json(
      { message: "Image uploaded successfully", image },
      { status: 201 }
    );
  } catch (err) {
    console.error("[upload-image] Cloudinary error:", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 502 });
  }

});


