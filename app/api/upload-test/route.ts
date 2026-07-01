import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const uploadDir = "/home/fmojnedg/public_html/hrms";
  const results: any = {
    uploadDir,
    exists: false,
    writeable: false,
    error: null,
    cwd: process.cwd(),
    envUploadDir: process.env.UPLOAD_DIR || "not set",
    envUploadUrlPrefix: process.env.UPLOAD_URL_PREFIX || "not set",
  };

  try {
    // Check if path exists
    try {
      const stats = await fs.stat(uploadDir);
      results.exists = true;
      results.isDirectory = stats.isDirectory();
    } catch (e: any) {
      results.exists = false;
      results.statError = e.message;
    }

    // Try creating the dir if not exists
    await fs.mkdir(uploadDir, { recursive: true });
    results.existsAfterMkdir = true;

    // Try writing a file
    const testFile = path.join(uploadDir, `.write_test_${Date.now()}`);
    await fs.writeFile(testFile, "test content");
    results.writeable = true;

    // Try deleting the test file
    await fs.unlink(testFile);
    results.deleted = true;
  } catch (err: any) {
    results.writeable = false;
    results.error = err.message;
    results.stack = err.stack;
  }

  return NextResponse.json(results);
}
