import type { MediaUploadHandler } from "@/core/editorTypes";
import { showOverlayNotice } from "@/core/overlayFeedback";
import { normalizeSafeMediaUrl } from "@/utils/safeUrl";

export type MediaKind = "image" | "video";

/**
 * 解析一次本地上传得到的媒体地址。
 *
 * - 传了 `upload` 回调：用它返回的 URL，并强制过一遍 {@link normalizeSafeMediaUrl}
 *   （宿主的上传服务同样可能返回不可信地址）；不合格直接抛错，不静默降级。
 * - 未传 `upload`：回退为 `URL.createObjectURL(file)` 生成的 **`blob:` 对象 URL**
 *   （不是 DataURL），并弹一条「未配置上传处理器」提示。blob URL 只在当前页面会话内
 *   有效，刷新或换页即失效，因此仅适合本地预览；生产集成必须传 `upload`。
 */
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
