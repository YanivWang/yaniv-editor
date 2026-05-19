/**
 * Core Extensions - 核心扩展配置
 * @description 根据版本动态加载编辑器扩展
 */

import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TableOfContents from "@tiptap/extension-table-of-contents";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import UniqueID from "@tiptap/extension-unique-id";
import StarterKit from "@tiptap/starter-kit";

import { DEFAULT_EDITOR_VERSION, type EditorVersion } from "@/core/editorTypes";
import {
  CustomAiExtension,
  ContinueWritingExtension,
  PolishExtension,
  SummarizeExtension,
  TranslationExtension,
  AiHighlightMark,
} from "@/features/ai";
import { t } from "@/locales";

import { codeBlockLowlightExtension } from "./codeBlockLowlight";
import { FontSize } from "./fontSize";
import { FormatPainter } from "./formatPainter";
import { LineHeight } from "./lineHeight";
import { ListShortcuts } from "./listShortcuts";
import { MathExtension } from "./math";
import { OfficePaste, type OfficePasteOptions } from "./office-paste";
import { PasteImage } from "./pasteImage";
import { ResizableImage } from "./resizableImage";
import { resolveExtensionGates, type ResolvedExtensionGates } from "./resolveExtensionGates";
import { SearchReplace } from "./search-replace";
import { Video } from "./video";
import { YanivPlaceholder } from "./yanivPlaceholder";

import type { AnyExtension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * 扩展配置选项
 */
export interface ExtensionsOptions {
  /** 是否启用图片增强功能（拖拽大小调整），默认 true */
  enableImageResize?: boolean;
  /** OfficePaste 回调与流水线开关（宿主可弹窗提示、逐项关闭 transform） */
  officePaste?: Partial<
    Pick<
      OfficePasteOptions,
      "onPasteFromOfficeWithImages" | "imagePlaceholderHtml" | "htmlTransforms" | "excelTablePaste"
    >
  >;
  /**
   * 功能门控（由 resolveExtensionGates 生成或与 UI 对齐）
   * 不传则默认由版本解析（参见 resolveExtensionGates）
   */
  features?: ResolvedExtensionGates;
  /** 大纲扩展：滚动容器（用于高亮当前章节） */
  outline?: {
    scrollParent?: () => HTMLElement | Window;
  };
}

/**
 * 根据版本获取扩展配置
 * @param _version 编辑器版本（扩展差异主要通过 options.features 门控）
 */
export function buildEditorExtensions(
  version: EditorVersion = DEFAULT_EDITOR_VERSION,
  options: ExtensionsOptions = {},
): AnyExtension[] {
  const { enableImageResize = true, officePaste, outline: outlineOptions } = options;

  const gates: ResolvedExtensionGates =
    options.features ??
    resolveExtensionGates({
      version,
    });

  const extensions: AnyExtension[] = [];

  // 基础扩展（所有版本都包含）
  const starterKitConfig: Record<string, unknown> = {
    // 禁用一些高级功能，在基础版中通过其他扩展提供
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    // 禁用 link 和 underline，因为后面会单独添加配置版本
    link: false,
    underline: false,
    dropcursor: {
      width: 6,
      color: false,
    },
    // 使用 CodeBlockLowlight 替代 StarterKit 内置代码块
    codeBlock: false,
  };

  extensions.push(StarterKit.configure(starterKitConfig));
  extensions.push(codeBlockLowlightExtension);

  // 占位符：段落仅光标所在时显示；标题/代码块等空块始终显示（见 yanivPlaceholder.ts）
  extensions.push(
    YanivPlaceholder.configure({
      placeholder: ({ node }: { node: ProseMirrorNode }) => {
        if (node.type.name === "heading") {
          return t("placeholder.heading");
        }
        if (node.type.name === "codeBlock") {
          return t("placeholder.codeBlock");
        }
        return t("placeholder.paragraph");
      },
    }),
  );

  // 文本对齐扩展
  extensions.push(
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
  );

  // 下划线扩展
  extensions.push(Underline);

  // 颜色和文本样式扩展
  extensions.push(Color);
  extensions.push(TextStyle);
  extensions.push(
    Highlight.configure({
      multicolor: true,
    }),
  );

  // 图片扩展（与 features.image 对齐）
  if (gates.image) {
    extensions.push(
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        enableResize: enableImageResize,
      }),
    );
  }

  // 链接扩展
  extensions.push(
    Link.configure({
      openOnClick: true, // 允许点击链接跳转
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
  );

  // 列表扩展
  extensions.push(TaskList);
  extensions.push(
    TaskItem.configure({
      nested: true,
    }),
  );

  // 表格扩展（与 features.table 对齐）
  if (gates.table) {
    extensions.push(
      Table.configure({
        resizable: true,
      }),
    );
    extensions.push(TableRow);
    extensions.push(TableCell);
    extensions.push(TableHeader);
  }

  // 字体扩展
  extensions.push(FontFamily);
  extensions.push(FontSize);

  // 上标下标扩展
  extensions.push(Subscript);
  extensions.push(Superscript);

  // 行间距扩展
  extensions.push(LineHeight);

  // 字数统计扩展
  extensions.push(CharacterCount);

  // 视频扩展（与图片/媒体能力一起走）
  if (gates.image) {
    extensions.push(
      Video.configure({
        inline: false,
        allowBase64: true,
      }),
    );
  }

  // 大纲与标题锚点
  if (gates.outline) {
    extensions.push(
      UniqueID.configure({
        types: ["heading"],
      }),
      TableOfContents.configure({
        anchorTypes: ["heading"],
        ...(outlineOptions?.scrollParent ? { scrollParent: outlineOptions.scrollParent } : {}),
      }),
    );
  }

  // 强化 Office / WPS HTML 粘贴（列表、书签、Excel 表格等）
  if (gates.officePaste) {
    extensions.push(
      OfficePaste.configure({
        onPasteFromOfficeWithImages: officePaste?.onPasteFromOfficeWithImages,
        ...(officePaste?.imagePlaceholderHtml
          ? { imagePlaceholderHtml: officePaste.imagePlaceholderHtml }
          : {}),
        ...(officePaste?.htmlTransforms ? { htmlTransforms: officePaste.htmlTransforms } : {}),
        ...(officePaste?.excelTablePaste !== undefined
          ? { excelTablePaste: officePaste.excelTablePaste }
          : {}),
      }),
    );
  }

  // 粘贴图片（与 HTML 结构化粘贴拆分，避免 duplicate inline 图像）
  if (gates.image) {
    extensions.push(PasteImage);
  }

  extensions.push(ListShortcuts);

  // 查找替换
  if (gates.searchReplace) {
    extensions.push(
      SearchReplace.configure({
        scrollIntoViewOnNavigate: true,
      }),
    );
  }

  // 格式刷扩展
  if (gates.formatPainter) {
    extensions.push(FormatPainter);
  }

  // 数学公式扩展
  if (gates.math) {
    extensions.push(MathExtension);
  }

  // AI 功能扩展
  if (gates.ai) {
    extensions.push(AiHighlightMark);
    extensions.push(CustomAiExtension);
    extensions.push(ContinueWritingExtension);
    extensions.push(PolishExtension);
    extensions.push(SummarizeExtension);
    extensions.push(TranslationExtension);
  }

  return extensions;
}
