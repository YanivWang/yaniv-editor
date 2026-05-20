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

<style scoped>
/* 居中展示行内编辑器，模拟评论框场景 */
.demo-page--inline {
  flex: 1;
  align-items: center;
  min-height: 0;
  padding: 24px;
  overflow: auto;
}

.demo-inline {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}

.demo-inline__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: var(--ye-toolbar-bg);
  border-bottom: 1px solid var(--ye-border);
}

.demo-inline__content {
  min-height: 160px;
  padding: 12px 16px;
}
</style>
