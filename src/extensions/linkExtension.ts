/**
 * Shared Link extension factory — used by Full and Inline extension builders
 */
import { Link } from "@tiptap/extension-link";
import { registerCustomProtocol } from "linkifyjs";

import { normalizeSafeUrl } from "@/utils/safeUrl";

// tel 非 linkify 内置 scheme，须在首次 linkify 使用前注册（模块加载即执行一次）。
// TipTap Link 会在 onCreate 里对 options.protocols 逐个 registerCustomProtocol；
// 第二个编辑器实例重复注册会触发 “already initialized” 警告，
// 因此这里提前注册，并把 configure 的 protocols 传成空数组。
registerCustomProtocol("tel");

export function createLinkExtension() {
  return Link.configure({
    openOnClick: true,
    protocols: [],
    isAllowedUri: (url) => normalizeSafeUrl(url) !== null,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
}
