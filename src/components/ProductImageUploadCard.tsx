"use client";

import { type DragEvent, useRef, useState } from "react";

const maxCompressedImageSide = 1200;
const compressedImageQuality = 0.82;

type ProductImageUploadCardProps = {
  label: string;
  fileField: string;
  imageField: "image_url" | "image_url_2" | "image_url_3";
  imageUrl?: string | null;
  password: string;
  productId?: string;
};

export function ProductImageUploadCard({
  label,
  fileField,
  imageField,
  imageUrl,
  password,
  productId
}: ProductImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? "");
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  const previewUrl = localPreviewUrl || currentImageUrl;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files.item(0);

    if (file) {
      void handleFile(file);
    }
  }

  function handleInputChange() {
    const file = inputRef.current?.files?.item(0);

    if (file) {
      void handleFile(file);
    }
  }

  async function handleFile(file: File) {
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }

    setIsUploading(true);
    setMessage("Compressing image...");

    let imageFile = file;

    try {
      imageFile = await compressImageFile(file);
    } catch (error) {
      console.warn("Image compression failed. Uploading original file.", error);
      setMessage("Compression failed. Uploading original image...");
    } finally {
      setIsUploading(false);
    }

    if (!productId) {
      setFileInputFile(inputRef.current, imageFile);
      setLocalPreviewUrl(URL.createObjectURL(imageFile));
      setMessage(`${getCompressionMessage(file, imageFile)} Save product to upload.`);
      return;
    }

    await uploadImage(imageFile, file.size);
  }

  async function uploadImage(file: File, originalSize?: number) {
    setIsUploading(true);
    setMessage("Uploading compressed image...");

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("product_id", productId ?? "");
      formData.append("image_field", imageField);
      formData.append("file", file);

      const response = await fetch("/api/admin/products/images", {
        method: "POST",
        body: formData
      });
      const responseBody = (await response.json().catch(() => null)) as
        | { imageUrl?: string; message?: string }
        | null;

      if (!response.ok || !responseBody?.imageUrl) {
        throw new Error(responseBody?.message ?? "Failed to upload image.");
      }

      setCurrentImageUrl(responseBody.imageUrl);
      setLocalPreviewUrl("");
      setMessage(originalSize ? `Uploaded. ${formatFileSize(originalSize)} -> ${formatFileSize(file.size)}` : "Uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteImage() {
    if (!productId || !currentImageUrl) {
      setCurrentImageUrl("");
      setLocalPreviewUrl("");
      setMessage("");
      return;
    }

    setIsUploading(true);
    setMessage("Deleting...");

    try {
      const response = await fetch("/api/admin/products/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password,
          productId,
          imageField
        })
      });
      const responseBody = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? "Failed to delete image.");
      }

      setCurrentImageUrl("");
      setLocalPreviewUrl("");
      setMessage("Image deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete image.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-1.5">
      <input type="hidden" name={imageField} value={currentImageUrl} />
      <div className="text-[11px] font-semibold text-slate-800">{label}</div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-1 flex h-14 cursor-pointer items-center justify-center overflow-hidden rounded border bg-white transition ${
          isDragging
            ? "border-blue-500 ring-2 ring-blue-200"
            : "border-slate-200 hover:border-slate-400"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={label}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="px-2 text-center text-[11px] text-slate-500">
            Drop image here or tap to select
          </span>
        )}
      </div>
      <label className="mt-1.5 block text-[11px] font-medium text-slate-700">
        {productId ? "Drop or select to upload" : "Select image"}
        <input
          ref={inputRef}
          name={productId ? undefined : fileField}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] file:mr-1.5 file:rounded file:border-0 file:bg-slate-950 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white"
        />
      </label>
      {previewUrl ? (
        <button
          type="button"
          onClick={deleteImage}
          disabled={isUploading}
          className="mt-1.5 h-7 w-full rounded border border-red-300 px-2 text-[11px] font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete image
        </button>
      ) : null}
      {message ? (
        <p
          className={`mt-2 text-xs ${
            isUploading || message === "Uploaded." ? "text-emerald-700" : "text-slate-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

async function compressImageFile(file: File) {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const image = await loadImage(file);
  const { width, height } = getCompressedDimensions(
    image.naturalWidth,
    image.naturalHeight
  );

  if (!width || !height) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob =
    await canvasToBlob(canvas, "image/webp", compressedImageQuality) ??
    await canvasToBlob(canvas, "image/jpeg", 0.86);

  if (!blob) {
    return file;
  }

  if (
    blob.size >= file.size &&
    Math.max(image.naturalWidth, image.naturalHeight) <= maxCompressedImageSide
  ) {
    return file;
  }

  const extension = blob.type === "image/webp" ? "webp" : "jpg";

  return new File([blob], replaceFileExtension(file.name, extension), {
    type: blob.type,
    lastModified: Date.now()
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not read image."));
    };
    image.src = imageUrl;
  });
}

function getCompressedDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxCompressedImageSide) {
    return {
      width,
      height
    };
  }

  const scale = maxCompressedImageSide / longestSide;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[a-z0-9]+$/i, "");

  return `${baseName}.${extension}`;
}

function setFileInputFile(input: HTMLInputElement | null, file: File) {
  if (!input) {
    return;
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function getCompressionMessage(originalFile: File, uploadFile: File) {
  if (originalFile === uploadFile) {
    return `Image ready. ${formatFileSize(uploadFile.size)}.`;
  }

  return `Image compressed. ${formatFileSize(originalFile.size)} -> ${formatFileSize(uploadFile.size)}.`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}
