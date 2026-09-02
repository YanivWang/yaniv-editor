<template>
  <div
    ref="toolbarRef"
    class="inline-toolbar"
    role="toolbar"
    :aria-label="t('editor.toolbarLabel')"
  >
    <component :is="UndoRedoButton" v-if="config.undoRedo" :editor="editor" />
    <component :is="HeadingControl" v-if="config.heading" variant="dropdown" :editor="editor" />
    <component :is="TextFormatButtons" v-if="config.textFormat" :editor="editor" />
    <component :is="ListTools" v-if="config.list" :editor="editor" :show-task-list="true" />
    <component :is="AlignDropdown" v-if="config.align" :editor="editor" />
    <component :is="LinkButton" v-if="config.link" :editor="editor" />
    <component :is="ClearFormatButton" v-if="config.clearFormat" :editor="editor" />
    <template v-if="config.font">
      <component :is="FontFamilySelect" :editor="editor" />
      <component :is="FontSizeSelect" :editor="editor" />
    </template>
    <component :is="CodeBlockDropdown" v-if="config.codeBlock" :editor="editor" />
  </div>
</template>

<script setup lang="ts">
/**
 * InlineToolbar — maps InlineToolbarConfig to /inline toolbar components.
 * Child tools load via async import so disabled toolbar switches stay out of the initial chunk.
 */

import { ref } from "vue";

import { useRovingTabindex } from "@/composables/useRovingTabindex";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { defineGatedAsyncComponent } from "@/shared/gatedAsyncComponent";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

/**
 * `role="toolbar"` 按 WAI-ARIA APG 必须是**单一 tab stop**、内部用方向键移动焦点。
 * 顶栏 `ToolbarNav` 一直这么做，inline 工具栏漏了——键盘用户得逐个 Tab 穿过每个按钮，
 * 方向键也不起作用。
 */
const toolbarRef = ref<HTMLElement | null>(null);
useRovingTabindex(toolbarRef);

interface Props {
  editor: Editor;
  config: InlineToolbarConfig;
}

defineProps<Props>();

const UndoRedoButton = defineGatedAsyncComponent("UndoRedoButton", () =>
  import("@/components/editor/undo-redo").then((m) => m.UndoRedoButton),
);
const HeadingControl = defineGatedAsyncComponent("HeadingControl", () =>
  import("@/components/editor/heading").then((m) => m.HeadingControl),
);
const TextFormatButtons = defineGatedAsyncComponent("TextFormatButtons", () =>
  import("@/components/editor/text-format").then((m) => m.TextFormatButtons),
);
const ListTools = defineGatedAsyncComponent("ListTools", () =>
  import("@/components/editor/list").then((m) => m.ListTools),
);
const AlignDropdown = defineGatedAsyncComponent("AlignDropdown", () =>
  import("@/components/editor/align").then((m) => m.AlignDropdown),
);
const LinkButton = defineGatedAsyncComponent("LinkButton", () =>
  import("@/components/editor/link").then((m) => m.LinkButton),
);
const ClearFormatButton = defineGatedAsyncComponent("ClearFormatButton", () =>
  import("@/components/editor/format-clear").then((m) => m.ClearFormatButton),
);
const FontFamilySelect = defineGatedAsyncComponent("FontFamilySelect", () =>
  import("@/components/editor/font").then((m) => m.FontFamilySelect),
);
const FontSizeSelect = defineGatedAsyncComponent("FontSizeSelect", () =>
  import("@/components/editor/font").then((m) => m.FontSizeSelect),
);
const CodeBlockDropdown = defineGatedAsyncComponent("CodeBlockDropdown", () =>
  import("@/components/editor/code-block").then((m) => m.CodeBlockDropdown),
);
</script>
