import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const maxImageSize = 8 * 1024 * 1024;

type UploadProductImageInput = {
  file: File;
  productName: string;
  productSlug: string;
  category?: string | null;
  imageSlot: "main" | "secondary-1" | "secondary-2";
};

type UploadInquiryImageInput = {
  file: File;
  email?: string | null;
  slot: number;
};

export async function uploadProductImageToR2({
  file,
  productName,
  productSlug,
  category,
  imageSlot
}: UploadProductImageInput) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  if (file.size > maxImageSize) {
    throw new Error("Image file is too large. Maximum size is 8 MB.");
  }

  const config = getR2Config();
  const extension = getFileExtension(file.name, file.type);
  const safeCategory = slugify(category || "uncategorized") || "uncategorized";
  const safeProductName = slugify(productName || productSlug || "product") || "product";
  const safeImageSlot = imageSlotName(imageSlot);
  const key = [
    "products",
    safeCategory,
    safeProductName,
    `${safeProductName}-${safeImageSlot}-${Date.now()}-${randomSuffix()}${extension}`
  ].join("/");
  const body = Buffer.from(await file.arrayBuffer());
  const client = createR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

export async function uploadInquiryImageToR2({
  file,
  email,
  slot
}: UploadInquiryImageInput) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  if (file.size > maxImageSize) {
    throw new Error("Image file is too large. Maximum size is 8 MB.");
  }

  const config = getR2Config();
  const extension = getFileExtension(file.name, file.type);
  const safeEmail = slugify(email || "guest") || "guest";
  const safeSlot = Math.min(Math.max(Math.floor(slot) || 1, 1), 3);
  const dateFolder = new Date().toISOString().slice(0, 10);
  const key = [
    "inquiry-images",
    dateFolder,
    safeEmail,
    `customer-inquiry-image-${safeSlot}-${Date.now()}-${randomSuffix()}${extension}`
  ].join("/");
  const body = Buffer.from(await file.arrayBuffer());
  const client = createR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

export async function deleteProductImageFromR2(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return;
  }

  const config = getR2Config();
  const key = getR2KeyFromPublicUrl(imageUrl, config.publicBaseUrl);

  if (!key) {
    return;
  }

  const client = createR2Client(config);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key
    })
  );
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    throw new Error(
      "Cloudflare R2 is not configured. Add CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, and CLOUDFLARE_R2_PUBLIC_BASE_URL."
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl
  };
}

function createR2Client(config: ReturnType<typeof getR2Config>) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

function getR2KeyFromPublicUrl(imageUrl: string, publicBaseUrl: string) {
  const normalizedPublicBaseUrl = publicBaseUrl.replace(/\/$/, "");

  if (!imageUrl.startsWith(`${normalizedPublicBaseUrl}/`)) {
    return null;
  }

  return decodeURIComponent(imageUrl.slice(normalizedPublicBaseUrl.length + 1));
}

function getFileExtension(fileName: string, contentType: string) {
  const extension = fileName.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();

  if (extension) {
    return extension;
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function imageSlotName(imageSlot: UploadProductImageInput["imageSlot"]) {
  if (imageSlot === "main") {
    return "main-image";
  }

  if (imageSlot === "secondary-1") {
    return "secondary-image-1";
  }

  return "secondary-image-2";
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}
