import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
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

import { Callout } from "@/extensions/callout";
import { codeBlockLowlightExtension } from "@/extensions/codeBlockLowlight";
import { Column, ColumnLayout } from "@/extensions/column";
import { DragHandleExtension } from "@/extensions/dragHandle";
import { Embed } from "@/extensions/embed";
import { FontSize } from "@/extensions/fontSize";
import { FormatPainter } from "@/extensions/formatPainter";
import { LineHeight } from "@/extensions/lineHeight";
import { createLinkExtension } from "@/extensions/linkExtension";
import { ListShortcuts } from "@/extensions/listShortcuts";
import { NotionMarkdownInput } from "@/extensions/markdownInput/NotionMarkdownInput";
import { Mention } from "@/extensions/mention";
import { OfficePaste } from "@/extensions/office-paste";
import {
  OutlineScrollParentBinder,
  getBoundOutlineScrollParent,
} from "@/extensions/outlineScrollParentBinder";
import { PasteImage } from "@/extensions/pasteImage";
import { ResizableImage } from "@/extensions/resizableImage";
import { SearchReplace } from "@/extensions/search-replace";
import { SlashCommandExtension } from "@/extensions/slashCommand";
import { TableCellWithBackground } from "@/extensions/table/TableCellWithBackground";
import { ToggleBlock } from "@/extensions/toggle";
import { Video } from "@/extensions/video";
import { YanivPlaceholder } from "@/extensions/yanivPlaceholder";
import {
  CustomAiExtension,
  ContinueWritingExtension,
  PolishExtension,
  SummarizeExtension,
  TranslationExtension,
  AiHighlightMark,
} from "@/features/ai";
import { aiSuggestionManager } from "@/features/ai/shared/aiSuggestionManager";

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
    extensions: () => [
      Table.configure({ resizable: true }),
      TableRow,
      TableCellWithBackground,
      TableHeader,
    ],
  },
  {
    id: "video",
    tier: "content",
    order: 50,
    featureKey: "video",
    schemaSignature: () => "video",
    fullToolbarSlugs: ["video"],
    extensions: () => [Video.configure({ inline: false, allowBase64: true })],
  },
  {
    id: "outline",
    tier: "chromeCoupled",
    order: 60,
    featureKey: "outline",
    schemaSignature: () => "outline",
    fullToolbarSlugs: ["outline"],
    chrome: ["outlinePanel"],
    extensions: () => [
      UniqueID.configure({ types: ["heading"] }),
      TableOfContents.configure({
        anchorTypes: ["heading"],
        scrollParent: () =>
          getBoundOutlineScrollParent() ??
          (typeof window !== "undefined" ? window : (null as unknown as Window)),
      }),
      OutlineScrollParentBinder,
    ],
  },
  {
    id: "officePaste",
    tier: "content",
    order: 70,
    featureKey: "officePaste",
    extensions: (ctx) => [
      OfficePaste.configure({
        onPasteFromOfficeWithImages: ctx.officePaste.onPasteFromOfficeWithImages(),
      }),
    ],
  },
  {
    id: "searchReplace",
    tier: "auxiliary",
    order: 80,
    featureKey: "searchReplace",
    fullToolbarSlugs: ["searchReplace"],
    extensions: () => [SearchReplace.configure({ scrollIntoViewOnNavigate: true })],
  },
  {
    id: "formatPainter",
    tier: "interaction",
    order: 90,
    featureKey: "formatPainter",
    fullToolbarSlugs: ["formatPainter"],
    extensions: () => [FormatPainter],
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
    extensions: (ctx) => {
      const aiOpts = {
        getProvider: () => ctx.aiConfig()?.provider ?? "openai",
        getApiKey: () => ctx.aiConfig()?.apiKey,
        getModel: () => ctx.aiConfig()?.model,
        getEndpoint: () => ctx.aiConfig()?.endpoint,
        getTimeout: () => ctx.aiConfig()?.timeout ?? 30_000,
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
      aiSuggestionManager.bindLocale(aiOpts.getLocaleText);
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
    extensions: () => [
      ToggleBlock,
      Callout,
      Column,
      ColumnLayout,
      Embed,
      Mention,
      NotionMarkdownInput,
    ],
  },
  {
    id: "dragHandle",
    tier: "interaction",
    order: 200,
    featureKey: "dragHandle",
    extensions: (ctx) => [
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
    ],
  },
  {
    id: "slashCommand",
    tier: "interaction",
    order: 210,
    featureKey: "slashCommand",
    extensions: (ctx) => [
      SlashCommandExtension.configure({
        onActivate: (state) => {
          if (!ctx.isEditable.value) return;
          ctx.blockMenuHost.activate(state);
        },
        onDeactivate: () => ctx.blockMenuHost.hide(),
        onQueryChange: (query) => ctx.blockMenuHost.updateQuery(query),
      }),
    ],
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
