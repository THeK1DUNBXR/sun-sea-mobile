/**
 * Receipt / cheque / UPI screenshot storage.
 *
 * Driver is chosen by MOBILE_STORAGE_DRIVER=imagekit|s3 (defaults to s3 when
 * AWS_S3_BUCKET is set, else ImageKit — the store the ERP already uses).
 *
 * S3 needs `npm install @aws-sdk/client-s3` plus AWS_S3_BUCKET, AWS_REGION and
 * credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or an instance role).
 * Optional AWS_S3_PUBLIC_URL overrides the returned base URL (CloudFront etc.).
 */
import crypto from "crypto";
import path from "path";
import multer from "multer";
import { ApiError } from "../../utils/ApiError";
import { uploadToImageKit } from "../../utils/Imagekit";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

export const uploadMobileAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP, HEIC images or PDF are allowed"));
    cb(null, true);
  },
});

export type StorageDriver = "imagekit" | "s3";

export function activeDriver(): StorageDriver {
  const explicit = (process.env.MOBILE_STORAGE_DRIVER || "").toLowerCase();
  if (explicit === "s3" || explicit === "imagekit") return explicit;
  return process.env.AWS_S3_BUCKET ? "s3" : "imagekit";
}

export interface StoredFile {
  url: string;
  fileId?: string;
  driver: StorageDriver;
  size: number;
  mimeType: string;
}

function extFor(file: Express.Multer.File) {
  const fromName = path.extname(file.originalname || "").toLowerCase().replace(".", "");
  if (fromName) return fromName;
  return (
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" }[
      file.mimetype
    ] || "bin"
  );
}

export async function storeAttachment(file: Express.Multer.File, folder: string): Promise<StoredFile> {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "misc";
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extFor(file)}`;
  const driver = activeDriver();

  if (driver === "s3") {
    let S3Client: any, PutObjectCommand: any;
    try {
      ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
    } catch {
      throw new ApiError(500, "S3 storage selected but @aws-sdk/client-s3 is not installed");
    }
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-1";
    if (!bucket) throw new ApiError(500, "AWS_S3_BUCKET is not configured");
    const key = `sunsea-mobile/${safeFolder}/${fileName}`;
    const client = new S3Client({ region });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { source: "sunsea-mobile" },
      })
    );
    const base = (process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/, "");
    return { url: `${base}/${key}`, fileId: key, driver, size: file.size, mimeType: file.mimetype };
  }

  const url = await uploadToImageKit(file.buffer, fileName, `/sunsea-mobile/${safeFolder}`);
  return { url, driver, size: file.size, mimeType: file.mimetype };
}
