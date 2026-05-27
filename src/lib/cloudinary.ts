import { v2 as cloudinary } from "cloudinary";

function uploadBuffer(buffer: Buffer): Promise<string> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "alternative/covers", resource_type: "image" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
          else resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}

export async function uploadCover(file: File): Promise<string> {
  return uploadBuffer(Buffer.from(await file.arrayBuffer()));
}

export async function uploadCoverBuffer(buffer: Buffer): Promise<string> {
  return uploadBuffer(buffer);
}
