/**
 * Shared Link extension factory — used by Full and Inline extension builders
 */
import { Link } from "@tiptap/extension-link";
import { registerCustomProtocol } from "linkifyjs";

import { createLinkHrefGuardPlugin } from "@/utils/linkHrefPolicy";
import { normalizeSafeUrl } from "@/utils/safeUrl";

// tel 非 linkify 内置 scheme，须在首次 linkify 使用前注册（模块加载即执行一次）。
// TipTap Link 会在 onCreate 里对 options.protocols 逐个 registerCustomProtocol；
// 第二个编辑器实例重复注册会触发 “already initialized” 警告，
// 因此这里提前注册，并把 configure 的 protocols 传成空数组。
registerCustomProtocol("tel");

/**
 * `isAllowedUri` 只管 DOM 边界与命令；JSON 与任意事务这两条要靠守卫插件兜底，
 * 见 `utils/linkHrefPolicy.ts` 文件头。
 */
const SafeLink = Link.extend({
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), createLinkHrefGuardPlugin(this.type)];
  },
});

export function createLinkExtension() {
  return SafeLink.configure({
    openOnClick: true,
    protocols: [],
    isAllowedUri: (url) => normalizeSafeUrl(url) !== null,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
}
