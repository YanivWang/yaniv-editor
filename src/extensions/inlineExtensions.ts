/**
 * Inline extension builder — toolbar gates drive Tiptap registration (sync, lightweight)
 */
import { FontFamily } from "@tiptap/extension-font-family";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import { t } from "@/locales";

import { codeBlockLowlightExtension } from "./codeBlockLowlight";
import { FontSize } from "./fontSize";
import { createLinkExtension } from "./linkExtension";
import { YanivPlaceholder } from "./yanivPlaceholder";

import type { AnyExtension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface ResolvedInlineExtensionGates {
  undoRedo: boolean;
  heading: boolean;
  textFormat: boolean;
  list: boolean;
  align: boolean;
  link: boolean;
  clearFormat: boolean;
  font: boolean;
  codeBlock: boolean;
}

export interface ResolveInlineExtensionGatesInput {
  toolbar?: InlineToolbarConfig;
}

export interface BuildInlineExtensionsOptions {
  gates: ResolvedInlineExtensionGates;
  placeholder?: string;
  extraExtensions?: AnyExtension[];
}

const INLINE_TOOLBAR_KEYS = [
  "undoRedo",
  "heading",
  "textFormat",
  "list",
  "align",
  "link",
  "clearFormat",
  "font",
  "codeBlock",
] as const satisfies ReadonlyArray<keyof InlineToolbarConfig>;

/** Normalize toolbar config to explicit booleans (opt-in: only `true` enables) */
export function resolveInlineExtensionGates(
  input: ResolveInlineExtensionGatesInput = {},
): ResolvedInlineExtensionGates {
  const toolbar = input.toolbar ?? {};

  return {
    undoRedo: toolbar.undoRedo === true,
    heading: toolbar.heading === true,
    textFormat: toolbar.textFormat === true,
    list: toolbar.list === true,
    align: toolbar.align === true,
    link: toolbar.link === true,
    clearFormat: toolbar.clearFormat === true,
    font: toolbar.font === true,
    codeBlock: toolbar.codeBlock === true,
  };
}

export function buildInlineExtensions(options: BuildInlineExtensionsOptions): AnyExtension[] {
  const { gates, placeholder, extraExtensions = [] } = options;
  const extensions: AnyExtension[] = [];

  const starterKitConfig: Record<string, unknown> = {
    heading: gates.heading ? { levels: [1, 2, 3, 4, 5, 6] } : false,
    bulletList: gates.list ? {} : false,
    orderedList: gates.list ? {} : false,
    bold: gates.textFormat ? {} : false,
    italic: gates.textFormat ? {} : false,
    strike: gates.textFormat ? {} : false,
    link: false,
    underline: false,
    codeBlock: false,
    dropcursor: {
      width: 4,
      color: false,
    },
  };

  if (!gates.undoRedo) {
    starterKitConfig.undoRedo = false;
  }

  extensions.push(StarterKit.configure(starterKitConfig));

  if (gates.textFormat) {
    extensions.push(Underline);
  }

  if (gates.list) {
    extensions.push(
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    );
  }

  if (gates.align) {
    extensions.push(
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    );
  }

  if (gates.link) {
    extensions.push(createLinkExtension());
  }

  if (gates.font) {
    extensions.push(TextStyle, FontFamily, FontSize);
  }

  if (gates.codeBlock) {
    extensions.push(codeBlockLowlightExtension);
  }

  if (placeholder) {
    extensions.push(
      YanivPlaceholder.configure({
        placeholder: ({ node }: { node: ProseMirrorNode }) => {
          if (node.type.name === "heading") {
            return t("placeholder.heading");
          }
          if (node.type.name === "codeBlock") {
            return t("placeholder.codeBlock");
          }
          return placeholder;
        },
      }),
    );
  }

  extensions.push(...extraExtensions);

  return extensions;
}

/** True when at least one inline toolbar switch is enabled */
export function hasInlineToolbarItems(toolbar?: InlineToolbarConfig): boolean {
  if (!toolbar) return false;
  return INLINE_TOOLBAR_KEYS.some((key) => toolbar[key] === true);
}
