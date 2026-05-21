import { notification } from "ant-design-vue";

import type { MediaUploadHandler } from "@/core/editorTypes";

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
    return upload(file);
  }

  const label =
    translate?.(`messages.${kind}UploadNotConfigured`) ?? `messages.${kind}UploadNotConfigured`;

  notification.warning({
    message: label,
    duration: 5,
    placement: "topRight",
  });

  return URL.createObjectURL(file);
}
