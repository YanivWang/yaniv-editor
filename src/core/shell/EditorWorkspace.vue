<template>
  <div class="yaniv-editor__workspace">
    <div class="document-body">
      <div v-if="chrome.showOutlineRail" class="document-body__outline-rail">
        <Transition name="outline-panel">
          <OutlinePanel
            v-if="showOutlinePanel"
            :placement="presetLayout.outlineAnchor"
            :scroll-parent="getScrollParent"
            :zoom-level="zoomLevel"
          />
        </Transition>
      </div>
      <div ref="containerRef" class="document-container">
        <CodeBlockLanguageBadge
          v-if="editor && toolbarConfig.codeBlock"
          :container="containerRef"
        />
        <div class="document-pages" :style="{ transform: `scale(${zoomLevel / 100})` }">
          <div class="continuous-pages">
            <EditorContent
              v-if="editor"
              :editor="editor as import('@tiptap/vue-3').Editor"
              class="document-content"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { CodeBlockLanguageBadge } from "@/components/editor/code-block";
import { OutlinePanel, useOutlinePanel } from "@/components/editor/outline";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorRuntimeContext } from "@/core/runtime/editorRuntimeContext";
import type { FullChromePolicy } from "@/core/runtime/types";

defineProps<{
  chrome: FullChromePolicy;
  zoomLevel: number;
}>();

const editor = useYanivEditor();
const { profile, presetLayout, toolbarConfig } = useEditorRuntimeContext();
const { expanded: outlineExpanded } = useOutlinePanel();

const containerRef = ref<HTMLElement | null>(null);
const getScrollParent = () => containerRef.value;

const showOutlinePanel = computed(
  () => profile.value.gates.outline && outlineExpanded.value && toolbarConfig.value.outline,
);

onMounted(async () => {
  await nextTick();
  const el = containerRef.value;
  if (el && editor.value) {
    editor.value.commands.bindOutlineScrollParent(el);
  }
});

watch(containerRef, (el) => {
  if (el && editor.value) {
    editor.value.commands.bindOutlineScrollParent(el);
  }
});

defineExpose({ containerRef: containerRef });
</script>
