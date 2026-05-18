import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import {
  mergeOfficeHtmlTransforms,
  applyOfficeHtmlTransforms,
  transformExcelPaste,
  type OfficeHtmlTransformsConfig,
} from "./pipeline";
import { hasImageInPastePayload, isOfficeHtml, isOfficeLikeClipboardData } from "./utils";

export interface OfficePasteOptions {
  /**
   * 剪贴中含图片（常见 Word 结构化粘贴）：提示用户内容由 HTML + 占位处理
   */
  onPasteFromOfficeWithImages?: () => void;
  /** 替代 VML/HTML 内的图片片段 */
  imagePlaceholderHtml: string;
  /**
   * HTML transform 逐项开关（默认全开）；用于宿主对齐或 A/B
   */
  htmlTransforms?: Partial<OfficeHtmlTransformsConfig>;
  /** 是否处理从 Excel 复制的表格粘贴；默认 true */
  excelTablePaste?: boolean;
}

export const OfficePaste = Extension.create<OfficePasteOptions>({
  name: "officePaste",

  priority: 1000,

  addOptions() {
    return {
      onPasteFromOfficeWithImages: undefined,
      imagePlaceholderHtml: "<span data-tp-office-paste-image>[图片将由文档 HTML 带入]</span>",
      htmlTransforms: undefined as OfficePasteOptions["htmlTransforms"],
      excelTablePaste: true,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    const plugin = new Plugin({
      key: new PluginKey("tpOfficePaste"),

      props: {
        transformPastedHTML(html) {
          if (!html || !isOfficeHtml(html)) return html;

          const transforms = mergeOfficeHtmlTransforms(options.htmlTransforms);
          return applyOfficeHtmlTransforms(html, {
            imagePlaceholderHtml: options.imagePlaceholderHtml,
            transforms,
          });
        },

        handlePaste(view, event) {
          const e = event as ClipboardEvent | undefined;
          if (!e?.clipboardData) return false;

          const html = e.clipboardData.getData("text/html") || "";
          const files = Array.from(e.clipboardData.files || []);
          const officeLike = isOfficeLikeClipboardData(e.clipboardData);
          const hasImage = hasImageInPastePayload(files, html);

          if (officeLike && hasImage) {
            options.onPasteFromOfficeWithImages?.();
            (
              e as ClipboardEvent & { skipInlineImagePasteFromOffice?: boolean }
            ).skipInlineImagePasteFromOffice = true;
          }

          if (options.excelTablePaste !== false && transformExcelPaste(view, e)) {
            return true;
          }

          return false;
        },
      },
    });

    return [plugin];
  },
});
