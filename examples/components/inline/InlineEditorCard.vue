<template>
  <div class="inline-demo__editor-area">
    <div class="inline-editor-card">
      <InlineToolbar
        :editor="editor"
        :enabled-plugins="enabledPlugins"
        :has-any-plugin="hasAnyPlugin"
      />

      <div class="inline-editor-content">
        <EditorContent v-if="editor" :editor="editor" />
      </div>

      <div class="inline-editor-footer">
        <span class="inline-editor-footer__stats">{{ statsText }}</span>
        <span class="inline-editor-footer__plugins">{{ pluginsActiveText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { computed } from "vue";

import { t } from "../../../src/locales";

import InlineToolbar from "./InlineToolbar.vue";

import type { InlineToolbarPluginView } from "./types";
import type { Editor } from "@tiptap/vue-3";

const props = defineProps<{
  editor: Editor | undefined;
  enabledPlugins: InlineToolbarPluginView[];
  hasAnyPlugin: boolean;
  statsText: string;
  enabledCount: number;
  totalCount: number;
}>();

const pluginsActiveText = computed(() =>
  t("demo.inline.pluginsActive", {
    enabled: String(props.enabledCount),
    total: String(props.totalCount),
  }),
);
</script>
