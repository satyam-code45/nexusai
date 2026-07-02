import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  if (!url.startsWith("https://res.cloudinary.com/")) {
    return NextResponse.json({ error: "Unauthorized proxy target" }, { status: 403 });
  }

  // Detect delivery type (upload vs authenticated)
  const typeMatch = url.match(/\/raw\/(upload|authenticated)\//);
  const deliveryType = typeMatch?.[1] ?? "upload";

  // Extract full public_id including extension.
  // For Cloudinary raw resources the public_id is stored WITH its file extension
  // (e.g. "nexusai/uploads/file.pdf"), so we must NOT strip it before calling
  // private_download_url — stripping causes a "Resource not found" 404.
  const match = url.match(/\/raw\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Cannot parse Cloudinary URL" }, { status: 400 });
  }
  const publicId = match[1]; // full path WITH extension, e.g. "nexusai/uploads/file.pdf"

  try {
    // Pass publicId WITH extension; omit the format argument (empty string) so Cloudinary
    // does not try to look up "nexusai/uploads/file.pdf" + ".pdf" = double extension.
    const downloadUrl = (cloudinary.utils as any).private_download_url(publicId, "", {
      resource_type: "raw",
      type: deliveryType,
    });

    const upstream = await fetch(downloadUrl);

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.error(`[pdf-proxy] ${upstream.status}: ${body.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Cloudinary returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (err) {
    console.error("[pdf-proxy] error:", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
  }
}
