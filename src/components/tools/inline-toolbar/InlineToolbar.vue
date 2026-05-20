<template>
  <div class="inline-toolbar" role="toolbar" :aria-label="t('editor.toolbarLabel')">
    <UndoRedoButton v-if="config.undoRedo" :editor="editor" />
    <HeadingControl v-if="config.heading" variant="dropdown" :editor="editor" />
    <TextFormatButtons v-if="config.textFormat" :editor="editor" />
    <ListTools v-if="config.list" :editor="editor" :show-task-list="true" />
    <AlignDropdown v-if="config.align" :editor="editor" />
    <LinkButton v-if="config.link" :editor="editor" />
    <ClearFormatButton v-if="config.clearFormat" :editor="editor" />
    <template v-if="config.font">
      <FontFamilySelect :editor="editor" />
      <FontSizeSelect :editor="editor" />
    </template>
    <CodeBlockDropdown v-if="config.codeBlock" :editor="editor" />
  </div>
</template>

<script setup lang="ts">
/**
 * InlineToolbar — maps InlineToolbarConfig to /inline toolbar components
 */
import { AlignDropdown } from "@/components/editor/align";
import { CodeBlockDropdown } from "@/components/editor/code-block";
import { FontFamilySelect, FontSizeSelect } from "@/components/editor/font";
import { ClearFormatButton } from "@/components/editor/format-clear";
import { HeadingControl } from "@/components/editor/heading";
import { LinkButton } from "@/components/editor/link";
import { ListTools } from "@/components/editor/list";
import { TextFormatButtons } from "@/components/editor/text-format";
import { UndoRedoButton } from "@/components/editor/undo-redo";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import { t } from "@/locales";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor;
  config: InlineToolbarConfig;
}

defineProps<Props>();
</script>
