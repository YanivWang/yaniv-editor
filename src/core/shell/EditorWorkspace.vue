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
          <button
            v-else
            type="button"
            class="outline-rail__handle"
            :class="`outline-rail__handle--${presetLayout.outlineAnchor}`"
            :title="t('editor.outlineToggle')"
            :aria-label="t('editor.outlineToggle')"
            @click="outlineToggle"
          >
            <ApartmentOutlined />
          </button>
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
import { ApartmentOutlined } from "@ant-design/icons-vue";
import { EditorContent } from "@tiptap/vue-3";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { CodeBlockLanguageBadge } from "@/components/editor/code-block";
import { OutlinePanel, useOutlinePanel } from "@/components/editor/outline";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { useEditorRuntimeContext } from "@/core/runtime/editorRuntimeContext";
import type { FullChromePolicy } from "@/core/runtime/types";

defineProps<{
  chrome: FullChromePolicy;
  zoomLevel: number;
}>();

const t = useEditorT();
const editor = useYanivEditor();
const { profile, presetLayout, toolbarConfig } = useEditorRuntimeContext();
const { expanded: outlineExpanded, toggle: outlineToggle } = useOutlinePanel();

const containerRef = ref<HTMLElement | null>(null);
const getScrollParent = () => containerRef.value;

/**
 * 面板可用性只取决于「能力是否开启」与「用户是否展开」。
 *
 * 这里刻意**不**再看 `toolbarConfig.outline`：那是「顶栏是否显示大纲按钮」的配置，
 * 与面板能否使用是两件事。此前把二者耦合，导致 notion preset（gate 开、顶栏隐藏、
 * COMPACT 里 outline 为 false）下面板永远渲染不出来，`defaultOutlineExpanded` 也失效。
 */
const showOutlinePanel = computed(() => profile.value.gates.outline && outlineExpanded.value);

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
