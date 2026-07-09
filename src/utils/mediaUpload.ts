import type { MediaUploadHandler } from "@/core/editorTypes";
import { showOverlayNotice } from "@/core/overlayFeedback";
import { normalizeSafeMediaUrl } from "@/utils/safeUrl";

export type MediaKind = "image" | "video";

export interface ResolveMediaUrlOptions {
  file: File;
  kind: MediaKind;
  upload?: MediaUploadHandler;
  translate?: (key: string) => string;
  /** 未配置 upload 时的提示挂载点（overlay portal） */
  overlayPortal: HTMLElement;
}

export async function resolveMediaUrl({
  file,
  kind,
  upload,
  translate,
  overlayPortal,
}: ResolveMediaUrlOptions): Promise<string> {
  if (upload) {
    const uploadedUrl = await upload(file);
    const safeUrl = normalizeSafeMediaUrl(uploadedUrl, kind);
    if (!safeUrl) throw new Error(`Unsafe ${kind} URL returned by upload handler`);
    return safeUrl;
  }

  const label =
    translate?.(`messages.${kind}UploadNotConfigured`) ?? `messages.${kind}UploadNotConfigured`;

  showOverlayNotice(overlayPortal, {
    message: label,
    kind: "warning",
    duration: 5,
  });

  return normalizeSafeMediaUrl(URL.createObjectURL(file), kind)!;
}
