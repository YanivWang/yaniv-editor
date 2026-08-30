/**
 * Capability Registry — 能力定义的唯一真源。
 *
 * ## 静态 vs 动态 import 的划分标准
 *
 * `extensions()` 允许返回 Promise，`buildExtensions` 会 await。据此：
 *
 * - **默认 preset（`basic`）已开启的能力**（core / image）走静态 import：它们必然被加载，
 *   拆成独立 chunk 只会多一次请求。
 * - **`basic` 默认关闭的能力**一律 `await import()`：table / video / outline / officePaste /
 *   searchReplace / formatPainter / math / ai / notionBlocks / dragHandle / slashCommand。
 *
 * 这样 `preset` 与 `features` 才真正决定**打包体积**，而不只是运行时是否注册。
 * 改动前所有能力都是静态 import，`preset="basic"` 的接入方仍会下载 DragHandle（1000+ 行）、
 * office-paste 流水线、search-replace 与全套 AI 扩展。
 *
 * 新增能力时：若它在 `basic` 下默认关闭，必须用动态 import。
 */
import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { codeBlockLowlightExtension } from "@/extensions/codeBlockLowlight";
import { FontSize } from "@/extensions/fontSize";
import { LineHeight } from "@/extensions/lineHeight";
import { createLinkExtension } from "@/extensions/linkExtension";
import { ListShortcuts } from "@/extensions/listShortcuts";
import { PasteImage } from "@/extensions/pasteImage";
import { ResizableImage } from "@/extensions/resizableImage";
import { YanivPlaceholder } from "@/extensions/yanivPlaceholder";

import type { BuildExtensionsCtx, CapabilityDefinition } from "./types";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

function resolveParagraphPlaceholder(ctx: BuildExtensionsCtx): string {
  return ctx.gates.slashCommand
    ? ctx.locale.placeholder.paragraphWithSlash
    : ctx.locale.placeholder.paragraph;
}

export const CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "core",
    tier: "core",
    order: 0,
    extensions: (ctx) => {
      const extensions = [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          link: false,
          underline: false,
          dropcursor: { width: 6, color: false },
          codeBlock: false,
        }),
        codeBlockLowlightExtension,
        YanivPlaceholder.configure({
          includeChildren: true,
          placeholder: ({ node }: { node: ProseMirrorNode }) => {
            if (node.type.name === "heading") return ctx.locale.placeholder.heading;
            if (node.type.name === "codeBlock") return ctx.locale.placeholder.codeBlock;
            return resolveParagraphPlaceholder(ctx);
          },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Underline,
        Color,
        TextStyle,
        Highlight.configure({ multicolor: true }),
        createLinkExtension(),
        TaskList,
        TaskItem.configure({ nested: true }),
        FontFamily,
        FontSize,
        Subscript,
        Superscript,
        LineHeight,
        CharacterCount,
        ListShortcuts,
      ];
      return extensions;
    },
  },
  {
    id: "image",
    tier: "content",
    order: 10,
    featureKey: "image",
    schemaSignature: () => "image",
    fullToolbarSlugs: ["image", "gallery"],
    extensions: () => [
      ResizableImage.configure({ inline: true, allowBase64: true, enableResize: true }),
      PasteImage,
    ],
  },
  {
    id: "table",
    tier: "content",
    order: 40,
    featureKey: "table",
    schemaSignature: () => "table",
    fullToolbarSlugs: ["table"],
    extensions: async () => {
      const [{ Table }, { TableRow }, { TableHeader }, { TableCellWithBackground }] =
        await Promise.all([
          import("@tiptap/extension-table"),
          import("@tiptap/extension-table-row"),
          import("@tiptap/extension-table-header"),
          import("@/extensions/table/TableCellWithBackground"),
        ]);
      return [Table.configure({ resizable: true }), TableRow, TableCellWithBackground, TableHeader];
    },
  },
  {
    id: "video",
    tier: "content",
    order: 50,
    featureKey: "video",
    schemaSignature: () => "video",
    fullToolbarSlugs: ["video"],
    extensions: async () => {
      const { Video } = await import("@/extensions/video");
      return [Video.configure({ inline: false, allowBase64: true })];
    },
  },
  {
    id: "outline",
    tier: "chromeCoupled",
    order: 60,
    featureKey: "outline",
    schemaSignature: () => "outline",
    fullToolbarSlugs: ["outline"],
    chrome: ["outlinePanel"],
    extensions: async (ctx) => {
      const [
        { default: UniqueID },
        { default: TableOfContents },
        { createOutlineScrollParentBinder },
      ] = await Promise.all([
        import("@tiptap/extension-unique-id"),
        import("@tiptap/extension-table-of-contents"),
        import("@/extensions/outlineScrollParentBinder"),
      ]);
      return [
        UniqueID.configure({ types: ["heading"] }),
        TableOfContents.configure({
          anchorTypes: ["heading"],
          scrollParent: () =>
            ctx.outline.scrollParent() ??
            (typeof window !== "undefined" ? window : (null as unknown as Window)),
        }),
        createOutlineScrollParentBinder({ bindScrollParent: ctx.outline.bindScrollParent }),
      ];
    },
  },
  {
    id: "officePaste",
    tier: "content",
    order: 70,
    featureKey: "officePaste",
    extensions: async (ctx) => {
      const { OfficePaste } = await import("@/extensions/office-paste");
      return [
        OfficePaste.configure({
          onPasteFromOfficeWithImages: ctx.officePaste.onPasteFromOfficeWithImages(),
        }),
      ];
    },
  },
  {
    id: "searchReplace",
    tier: "auxiliary",
    order: 80,
    featureKey: "searchReplace",
    fullToolbarSlugs: ["searchReplace"],
    extensions: async () => {
      const { SearchReplace } = await import("@/extensions/search-replace");
      return [SearchReplace.configure({ scrollIntoViewOnNavigate: true })];
    },
  },
  {
    id: "formatPainter",
    tier: "interaction",
    order: 90,
    featureKey: "formatPainter",
    fullToolbarSlugs: ["formatPainter"],
    extensions: async () => {
      const { FormatPainter } = await import("@/extensions/formatPainter");
      return [FormatPainter];
    },
  },
  {
    id: "math",
    tier: "content",
    order: 100,
    featureKey: "math",
    schemaSignature: () => "math",
    fullToolbarSlugs: ["math"],
    extensions: async () => {
      const { MathExtension } = await import("@/extensions/math");
      return [MathExtension];
    },
  },
  {
    id: "ai",
    tier: "content",
    order: 110,
    featureKey: "ai",
    schemaSignature: (profile) => (profile.gates.ai ? "ai" : ""),
    fullToolbarSlugs: ["ai"],
    extensions: async (ctx) => {
      // 全部 getter 直透宿主 ai-config 原值，不填兜底：
      // 兜底与 localStorage / .env 回退链由 client.ts 的 getAiConfig() 统一负责。
      // 这里若给 provider 填默认值，getAiConfig() 会误判宿主已托管而跳过回退分支。
      const aiOpts = {
        getProvider: () => ctx.aiConfig()?.provider,
        getApiKey: () => ctx.aiConfig()?.apiKey,
        getModel: () => ctx.aiConfig()?.model,
        getEndpoint: () => ctx.aiConfig()?.endpoint,
        getTimeout: () => ctx.aiConfig()?.timeout,
        getStorageMode: () => ctx.aiConfig()?.storageMode,
        getLocaleText: (key: string) => {
          const parts = key.split(".");
          let cur: unknown = ctx.locale;
          for (const part of parts) {
            if (cur && typeof cur === "object" && part in cur) {
              cur = (cur as Record<string, unknown>)[part];
            } else {
              return key;
            }
          }
          return typeof cur === "string" ? cur : key;
        },
      };
      // locale 由各扩展在发起 AI 会话时绑定（见 aiSuggestionManager.bindLocale 注释）：
      // 在此处按构建顺序绑定会让同页多实例中后构建者覆盖前者的语言。
      const {
        AiHighlightMark,
        CustomAiExtension,
        ContinueWritingExtension,
        PolishExtension,
        SummarizeExtension,
        TranslationExtension,
      } = await import("@/features/ai");

      return [
        AiHighlightMark,
        CustomAiExtension.configure(aiOpts),
        ContinueWritingExtension.configure(aiOpts),
        PolishExtension.configure(aiOpts),
        SummarizeExtension.configure(aiOpts),
        TranslationExtension.configure(aiOpts),
      ];
    },
  },
  {
    id: "notionBlocks",
    tier: "content",
    order: 115,
    featureKey: "slashCommand",
    schemaSignature: (profile) => (profile.gates.slashCommand ? "notionBlocks" : ""),
    extensions: async () => {
      const [
        { ToggleBlock },
        { Callout },
        { Column, ColumnLayout },
        { Embed },
        { Mention },
        { NotionMarkdownInput },
      ] = await Promise.all([
        import("@/extensions/toggle"),
        import("@/extensions/callout"),
        import("@/extensions/column"),
        import("@/extensions/embed"),
        import("@/extensions/mention"),
        import("@/extensions/markdownInput/NotionMarkdownInput"),
      ]);
      return [ToggleBlock, Callout, Column, ColumnLayout, Embed, Mention, NotionMarkdownInput];
    },
  },
  {
    id: "dragHandle",
    tier: "interaction",
    order: 200,
    featureKey: "dragHandle",
    extensions: async (ctx) => {
      const { DragHandleExtension } = await import("@/extensions/dragHandle");
      return [
        DragHandleExtension.configure({
          onOpenInsertMenu: (context) => {
            if (!ctx.isEditable.value) return;
            ctx.blockMenuHost.openInsert(context);
          },
          onCloseInsertMenu: () => ctx.blockMenuHost.hide(),
          getMenuLabel: (key: string) => {
            const parts = key.split(".");
            let cur: unknown = ctx.locale;
            for (const part of parts) {
              if (cur && typeof cur === "object" && part in cur) {
                cur = (cur as Record<string, unknown>)[part];
              } else {
                return key;
              }
            }
            return typeof cur === "string" ? cur : key;
          },
        }),
      ];
    },
  },
  {
    id: "slashCommand",
    tier: "interaction",
    order: 210,
    featureKey: "slashCommand",
    extensions: async (ctx) => {
      const { SlashCommandExtension } = await import("@/extensions/slashCommand");
      return [
        SlashCommandExtension.configure({
          onActivate: (state) => {
            if (!ctx.isEditable.value) return;
            ctx.blockMenuHost.activate(state);
          },
          onDeactivate: () => ctx.blockMenuHost.hide(),
          onQueryChange: (query) => ctx.blockMenuHost.updateQuery(query),
        }),
      ];
    },
  },
  // ── Inline capabilities ──
  {
    id: "inline-starter",
    tier: "core",
    order: 0,
    inlineAlways: true,
    inlineToolbarSlugs: ["undoRedo", "heading", "clearFormat"],
    extensions: (ctx) => {
      const g = ctx.gates;
      return [
        StarterKit.configure({
          heading: g.heading ? { levels: [1, 2, 3, 4, 5, 6] } : false,
          bulletList: g.list ? {} : false,
          orderedList: g.list ? {} : false,
          bold: g.textFormat ? {} : false,
          italic: g.textFormat ? {} : false,
          strike: g.textFormat ? {} : false,
          undoRedo: g.undoRedo !== false ? {} : false,
          link: false,
          underline: false,
          codeBlock: false,
          dropcursor: { width: 4, color: false },
        }),
      ];
    },
  },
  {
    id: "inline-underline",
    tier: "core",
    order: 5,
    inlineToolbarSlugs: ["textFormat"],
    extensions: (ctx) => (ctx.gates.textFormat ? [Underline] : []),
  },
  {
    id: "inline-list",
    tier: "core",
    order: 6,
    inlineToolbarSlugs: ["list"],
    extensions: (ctx) => (ctx.gates.list ? [TaskList, TaskItem.configure({ nested: true })] : []),
  },
  {
    id: "inline-align",
    tier: "core",
    order: 7,
    inlineToolbarSlugs: ["align"],
    extensions: (ctx) =>
      ctx.gates.align ? [TextAlign.configure({ types: ["heading", "paragraph"] })] : [],
  },
  {
    id: "inline-link",
    tier: "content",
    order: 10,
    inlineToolbarSlugs: ["link"],
    extensions: (ctx) => (ctx.gates.link ? [createLinkExtension()] : []),
  },
  {
    id: "inline-font",
    tier: "content",
    order: 11,
    inlineToolbarSlugs: ["font"],
    extensions: (ctx) => (ctx.gates.font ? [TextStyle, FontFamily, FontSize] : []),
  },
  {
    id: "inline-codeBlock",
    tier: "content",
    order: 12,
    inlineToolbarSlugs: ["codeBlock"],
    extensions: (ctx) => (ctx.gates.codeBlock ? [codeBlockLowlightExtension] : []),
  },
  {
    id: "inline-placeholder",
    tier: "core",
    order: 15,
    extensions: (ctx) => {
      const ph = ctx.inlinePlaceholder;
      if (!ph) return [];
      return [
        YanivPlaceholder.configure({
          placeholder: ({ node }: { node: ProseMirrorNode }) => {
            if (node.type.name === "heading") return ctx.locale.placeholder.heading;
            if (node.type.name === "codeBlock") return ctx.locale.placeholder.codeBlock;
            return ph;
          },
        }),
      ];
    },
  },
];
