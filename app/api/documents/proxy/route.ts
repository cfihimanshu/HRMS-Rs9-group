import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let targetUrl = "";
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    targetUrl = fileUrl.trim();
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTPS document URLs are allowed" }, { status: 400 });
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    const allowedHosts = (process.env.DOCUMENT_PROXY_ALLOWED_HOSTS || "res.cloudinary.com,ruhannetwork.com")
      .split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
    const allowed = allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
    if (!allowed) {
      return NextResponse.json({ error: "Document host is not allowed" }, { status: 403 });
    }

    console.log("Document Proxy Fetching URL:", targetUrl);

    // Fetch the file with standard User-Agent to avoid Cloudinary blocking
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: "Failed to fetch document from source storage",
        requestedUrl: targetUrl,
        statusCode: response.status,
        statusText: response.statusText
      }, { status: 500 });
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Document exceeds the 20 MB proxy limit" }, { status: 413 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Document exceeds the 20 MB proxy limit" }, { status: 413 });
    }
    
    // Determine content type
    let contentType = response.headers.get("content-type") || "";
    
    // Check magic bytes for PDF: %PDF (first 4 bytes: 0x25, 0x50, 0x44, 0x46)
    const isPdfMagic = buffer.length >= 4 && 
                       buffer[0] === 0x25 && 
                       buffer[1] === 0x50 && 
                       buffer[2] === 0x44 && 
                       buffer[3] === 0x46;

    if (isPdfMagic) {
      contentType = "application/pdf";
    }

    const cleanUrl = targetUrl.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".pdf") || targetUrl.toLowerCase().includes(".pdf")) {
      contentType = "application/pdf";
    }

    if (!contentType || contentType === "application/octet-stream") {
      if (cleanUrl.endsWith(".png")) contentType = "image/png";
      else if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (cleanUrl.endsWith(".gif")) contentType = "image/gif";
      else if (cleanUrl.endsWith(".webp")) contentType = "image/webp";
      else if (cleanUrl.endsWith(".pdf") || targetUrl.toLowerCase().includes(".pdf")) contentType = "application/pdf";
    }

    // Create a new response with the binary data
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", "inline");

    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error in document proxy:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error", 
      requestedUrl: targetUrl 
    }, { status: 500 });
  }
}
