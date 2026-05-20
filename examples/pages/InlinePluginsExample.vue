<template>
  <div class="demo-page demo-page--inline">
    <div class="yaniv-editor demo-inline">
      <div v-if="editor" class="demo-inline__toolbar">
        <UndoRedoButton :editor="editor" />
        <HeadingControl variant="dropdown" :editor="editor" />
        <TextFormatButtons :editor="editor" />
        <ListTools :editor="editor" />
      </div>
      <EditorContent v-if="editor" :editor="editor" class="demo-inline__content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount } from "vue";

import {
  HeadingControl,
  ListTools,
  TextFormatButtons,
  UndoRedoButton,
} from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const editor = useEditor({
  content: "<h2>行内拼装</h2><p>不包 <code>YanivEditor</code> 壳，按需挂载工具栏组件即可。</p>",
  extensions: [
    StarterKit.configure({ underline: false }),
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ],
  editorProps: {
    attributes: { class: "inline-prose" },
  },
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
