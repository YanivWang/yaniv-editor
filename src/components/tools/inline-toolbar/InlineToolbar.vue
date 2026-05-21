<template>
  <div class="inline-toolbar" role="toolbar" :aria-label="t('editor.toolbarLabel')">
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
import { defineAsyncComponent } from "vue";

import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import { useEditorT } from "@/core/infra/useEditorLocale";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

interface Props {
  editor: Editor;
  config: InlineToolbarConfig;
}

defineProps<Props>();

const UndoRedoButton = defineAsyncComponent(() =>
  import("@/components/editor/undo-redo").then((m) => m.UndoRedoButton),
);
const HeadingControl = defineAsyncComponent(() =>
  import("@/components/editor/heading").then((m) => m.HeadingControl),
);
const TextFormatButtons = defineAsyncComponent(() =>
  import("@/components/editor/text-format").then((m) => m.TextFormatButtons),
);
const ListTools = defineAsyncComponent(() =>
  import("@/components/editor/list").then((m) => m.ListTools),
);
const AlignDropdown = defineAsyncComponent(() =>
  import("@/components/editor/align").then((m) => m.AlignDropdown),
);
const LinkButton = defineAsyncComponent(() =>
  import("@/components/editor/link").then((m) => m.LinkButton),
);
const ClearFormatButton = defineAsyncComponent(() =>
  import("@/components/editor/format-clear").then((m) => m.ClearFormatButton),
);
const FontFamilySelect = defineAsyncComponent(() =>
  import("@/components/editor/font").then((m) => m.FontFamilySelect),
);
const FontSizeSelect = defineAsyncComponent(() =>
  import("@/components/editor/font").then((m) => m.FontSizeSelect),
);
const CodeBlockDropdown = defineAsyncComponent(() =>
  import("@/components/editor/code-block").then((m) => m.CodeBlockDropdown),
);
</script>
