<template>
  <div v-if="hasAnyPlugin" class="inline-toolbar">
    <TransitionGroup name="plugin-toggle">
      <template v-for="plugin in enabledPlugins" :key="plugin.id">
        <div v-if="plugin.id === 'undoRedo'" class="inline-toolbar__group">
          <UndoRedoButton :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'heading'" class="inline-toolbar__group">
          <HeadingDropdown :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'textFormat'" class="inline-toolbar__group">
          <TextFormatButtons :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'fontSize'" class="inline-toolbar__group">
          <FontSizeSelect :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'list'" class="inline-toolbar__group">
          <ListTools :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'align'" class="inline-toolbar__group">
          <AlignDropdown :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'link'" class="inline-toolbar__group">
          <LinkButton :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'codeBlock'" class="inline-toolbar__group">
          <CodeBlockDropdown :editor="editor" />
        </div>
        <div v-else-if="plugin.id === 'formatClear'" class="inline-toolbar__group">
          <ClearFormatButton :editor="editor" />
        </div>
      </template>
    </TransitionGroup>
  </div>
  <div v-else class="inline-toolbar inline-toolbar--empty">
    <span class="inline-toolbar__empty-text">{{ t("demo.inline.emptyToolbar") }}</span>
  </div>
</template>

<script setup lang="ts">

import {
  AlignDropdown,
  ClearFormatButton,
  CodeBlockDropdown,
  FontSizeSelect,
  HeadingDropdown,
  LinkButton,
  ListTools,
  TextFormatButtons,
  UndoRedoButton,
} from "@/components/editor";

import { t } from "../../../src/locales";

import type { InlineToolbarPluginView } from "./types";
import type { Editor } from "@tiptap/vue-3";

defineProps<{
  editor: Editor | undefined;
  enabledPlugins: InlineToolbarPluginView[];
  hasAnyPlugin: boolean;
}>();
</script>
