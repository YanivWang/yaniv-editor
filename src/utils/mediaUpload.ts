import type { MediaUploadHandler } from "@/core/editorTypes";

export const DEFAULT_IMAGE_DATA_URL_MAX_BYTES = 2 * 1024 * 1024;

export type MediaKind = "image" | "video";

export interface ResolveMediaUrlOptions {
  file: File;
  kind: MediaKind;
  upload?: MediaUploadHandler;
  maxImageDataUrlBytes?: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function resolveMediaUrl({
  file,
  kind,
  upload,
  maxImageDataUrlBytes = DEFAULT_IMAGE_DATA_URL_MAX_BYTES,
}: ResolveMediaUrlOptions): Promise<string> {
  if (upload) {
    return upload(file);
  }

  if (kind === "video") {
    throw new Error("uploadVideo is required for video upload");
  }

  if (file.size > maxImageDataUrlBytes) {
    throw new Error(
      `Image fallback only supports files up to ${Math.floor(maxImageDataUrlBytes / 1024 / 1024)}MB`,
    );
  }

  return readFileAsDataUrl(file);
}
