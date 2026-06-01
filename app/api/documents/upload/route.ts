import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Upload to Cloudinary using REST API instead of stream to prevent timeout
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: "acolyte_hr_documents" },
      process.env.CLOUDINARY_API_SECRET!
    );

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("timestamp", timestamp.toString());
    cloudinaryFormData.append("signature", signature);
    cloudinaryFormData.append("api_key", process.env.CLOUDINARY_API_KEY!);
    cloudinaryFormData.append("folder", "acolyte_hr_documents");

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: "POST", body: cloudinaryFormData }
    );

    const data = await cloudinaryRes.json();
    if (!cloudinaryRes.ok || !data.secure_url) {
      throw new Error(data.error?.message || "Cloudinary error");
    }

    return NextResponse.json({
      success: true,
      url: data.secure_url,
    });
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
