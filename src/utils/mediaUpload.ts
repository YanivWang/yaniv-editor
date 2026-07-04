import { notification } from "ant-design-vue";

import type { MediaUploadHandler } from "@/core/editorTypes";
import { normalizeSafeMediaUrl } from "@/utils/safeUrl";

export type MediaKind = "image" | "video";

export interface ResolveMediaUrlOptions {
  file: File;
  kind: MediaKind;
  upload?: MediaUploadHandler;
  translate?: (key: string) => string;
}

export async function resolveMediaUrl({
  file,
  kind,
  upload,
  translate,
}: ResolveMediaUrlOptions): Promise<string> {
  if (upload) {
    const uploadedUrl = await upload(file);
    const safeUrl = normalizeSafeMediaUrl(uploadedUrl, kind);
    if (!safeUrl) throw new Error(`Unsafe ${kind} URL returned by upload handler`);
    return safeUrl;
  }

  const label =
    translate?.(`messages.${kind}UploadNotConfigured`) ?? `messages.${kind}UploadNotConfigured`;

  notification.warning({
    message: label,
    duration: 5,
    placement: "topRight",
  });

  return normalizeSafeMediaUrl(URL.createObjectURL(file), kind)!;
}
