<template>
  <div class="demo-page demo-page--inline">
    <div class="yaniv-editor demo-inline">
      <div v-if="editor" class="demo-inline__toolbar">
        <UndoRedoButton :editor="editor" />
        <HeadingControl variant="dropdown" :editor="editor" />
        <TextFormatButtons :editor="editor" />
        <ListTools :editor="editor" :show-task-list="true" />
      </div>
      <EditorContent v-if="editor" :editor="editor" class="demo-inline__content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount } from "vue";

import {
  buildInlineExtensions,
  HeadingControl,
  ListTools,
  resolveInlineExtensionGates,
  TextFormatButtons,
  UndoRedoButton,
} from "@yanivjs/yaniv-editor/inline";

import "@yanivjs/yaniv-editor/inline.css";

const toolbar = {
  undoRedo: true,
  heading: true,
  textFormat: true,
  list: true,
  align: true,
} as const;

const editor = useEditor({
  content:
    "<h2>行内自行拼装</h2><p>自管 <code>Editor</code> 生命周期，按需挂载工具栏组件；扩展由 <code>buildInlineExtensions</code> 与 toolbar 同步。</p>",
  extensions: buildInlineExtensions({
    gates: resolveInlineExtensionGates({ toolbar }),
  }),
  editorProps: {
    attributes: { class: "inline-prose" },
  },
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
