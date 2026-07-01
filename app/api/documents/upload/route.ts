import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Client } from "basic-ftp";
import { Readable } from "stream";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    // Generate a unique file name to avoid collisions
    const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
    const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
    const cleanBaseName = baseName.replace(/[^a-z0-9_-]/g, "_");
    const uniqueFileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanBaseName}${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // FTP Upload Logic (If FTP details are provided in .env)
    if (process.env.FTP_HOST && process.env.FTP_USER && process.env.FTP_PASSWORD) {
      const client = new Client();
      try {
        await client.access({
          host: process.env.FTP_HOST,
          user: process.env.FTP_USER,
          password: process.env.FTP_PASSWORD,
          secure: process.env.FTP_SECURE === "true" // set to true if Milesweb requires FTPS
        });

        const stream = Readable.from(buffer);
        const ftpDir = process.env.FTP_DIR || "/public_html/hrms";
        const ftpPath = `${ftpDir}/${uniqueFileName}`;

        await client.uploadFrom(stream, ftpPath);
        client.close();

        const urlPrefix = process.env.UPLOAD_URL_PREFIX || "https://ruhannetwork.com/hrms";
        const basePrefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;
        const fileUrl = `${basePrefix}${uniqueFileName}`;

        return NextResponse.json({
          success: true,
          url: fileUrl,
        });
      } catch (ftpError: any) {
        client.close();
        console.error("FTP Upload Error:", ftpError);
        return NextResponse.json({ success: false, error: "FTP Upload failed: " + ftpError.message }, { status: 500 });
      }
    }

    // Local Storage Fallback Logic
    let uploadDir = process.env.UPLOAD_DIR || "/home/fmojnedg/public_html/hrms";
    let urlPrefix = process.env.UPLOAD_URL_PREFIX || "https://ruhannetwork.com/hrms";
    let isUsingFallback = false;

    // Check if the directory is writable. If not, use local public/hrms fallback (e.g. in local development)
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      // Verify write permission by creating a temporary check
      const testFile = path.join(uploadDir, `.write_test_${Date.now()}`);
      await fs.writeFile(testFile, "");
      await fs.unlink(testFile);
    } catch (e) {
      console.warn(`Target upload directory ${uploadDir} not writeable or does not exist. Using public/hrms fallback.`);
      uploadDir = path.join(process.cwd(), "public", "hrms");
      isUsingFallback = true;
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Write file to the target directory
    const targetPath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(targetPath, buffer);

    // Construct the public URL
    let fileUrl = "";
    if (isUsingFallback) {
      fileUrl = `/hrms/${uniqueFileName}`;
    } else {
      const basePrefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;
      fileUrl = `${basePrefix}${uniqueFileName}`;
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
    });
  } catch (error: any) {
    console.error("Local Upload Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
