import { notification } from "ant-design-vue";

import type { MediaUploadHandler } from "@/core/editorTypes";
import { t } from "@/locales";

export type MediaKind = "image" | "video";

export interface ResolveMediaUrlOptions {
  file: File;
  kind: MediaKind;
  upload?: MediaUploadHandler;
}

export async function resolveMediaUrl({
  file,
  kind,
  upload,
}: ResolveMediaUrlOptions): Promise<string> {
  if (upload) {
    return upload(file);
  }

  notification.warning({
    message: t(`messages.${kind}UploadNotConfigured`),
    duration: 5,
    placement: "topRight",
  });

  return URL.createObjectURL(file);
}
