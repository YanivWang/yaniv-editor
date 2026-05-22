/**
 * Shared Link extension factory — used by Full and Inline extension builders
 */
import { Link } from "@tiptap/extension-link";
import { registerCustomProtocol } from "linkifyjs";

import { normalizeSafeUrl } from "@/utils/safeUrl";

// tel 非 linkify 内置 scheme，须在首次 linkify 使用前注册。
// TipTap Link 在 onCreate 里也会 registerCustomProtocol；第二个编辑器实例会触发
// “already initialized” 警告，因此这里提前注册且 configure 不再传 protocols。
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
