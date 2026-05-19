<template>
  <div
    v-show="visible"
    class="code-block-language-badge"
    :style="badgeStyle"
    contenteditable="false"
    @mousedown.stop
    @click.stop
  >
    <a-select
      :value="currentLanguage"
      size="small"
      class="code-block-language-badge__select"
      :options="languageOptions"
      :get-popup-container="getPopupContainer"
      :dropdown-match-select-width="false"
      @change="onLanguageChange"
      @mousedown.stop
      @click.stop
    />
  </div>
</template>

<script setup lang="ts">
/**
 * CodeBlockLanguageBadge - 代码块内语言角标（焦点在代码块时显示）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { CODE_LANGUAGES, DEFAULT_CODE_BLOCK_LANGUAGE } from "@/configs/editorConstants";

import { findCodeBlockDepth, updateCodeBlockLanguage } from "./codeBlockUtils";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor | null | undefined;
  container?: HTMLElement | null;
}

const props = defineProps<Props>();

const visible = ref(false);
const badgeStyle = ref<Record<string, string>>({ top: "0", left: "0" });

const languageOptions = CODE_LANGUAGES.map((lang) => ({
  value: lang,
  label: lang,
}));

const currentLanguage = computed(() => {
  const lang = props.editor?.getAttributes("codeBlock")?.language;
  return typeof lang === "string" && lang ? lang : DEFAULT_CODE_BLOCK_LANGUAGE;
});

function getPopupContainer(): HTMLElement {
  return document.body;
}

function findActivePre(editor: Editor): HTMLElement | null {
  const depth = findCodeBlockDepth(editor);
  if (depth < 0) return null;

  const { $from } = editor.state.selection;
  const pos = $from.before(depth);
  const nodeDom = editor.view.nodeDOM(pos);
  if (nodeDom instanceof HTMLElement) {
    if (nodeDom.matches("pre")) return nodeDom;
    const pre = nodeDom.querySelector("pre");
    if (pre instanceof HTMLElement) return pre;
  }

  const domAtPos = editor.view.domAtPos($from.pos);
  let el: HTMLElement | null =
    domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;

  while (el && !el.matches("pre")) {
    el = el.parentElement;
  }
  return el;
}

function updatePosition() {
  const editor = props.editor;
  const container = props.container;
  if (!editor?.view || !container) {
    visible.value = false;
    return;
  }

  const pre = findActivePre(editor);
  if (!pre) {
    visible.value = false;
    return;
  }

  const preRect = pre.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  badgeStyle.value = {
    top: `${preRect.top - containerRect.top + container.scrollTop + 10}px`,
    left: `${preRect.left - containerRect.left + container.scrollLeft + 12}px`,
  };
  visible.value = true;
}

function scheduleUpdate() {
  requestAnimationFrame(updatePosition);
}

function onLanguageChange(language: string) {
  const editor = props.editor;
  if (!editor) return;
  updateCodeBlockLanguage(editor, language);
  scheduleUpdate();
}

function bindEditorEvents() {
  const editor = props.editor;
  if (!editor) return;
  editor.on("selectionUpdate", scheduleUpdate);
  editor.on("transaction", scheduleUpdate);
}

function unbindEditorEvents() {
  const editor = props.editor;
  if (!editor) return;
  editor.off("selectionUpdate", scheduleUpdate);
  editor.off("transaction", scheduleUpdate);
}

let scrollEl: HTMLElement | null = null;

function onScroll() {
  scheduleUpdate();
}

watch(
  () => props.editor,
  (next, prev) => {
    if (prev) unbindEditorEvents();
    if (next) {
      bindEditorEvents();
      scheduleUpdate();
    }
  },
  { immediate: true },
);

watch(
  () => props.container,
  (container) => {
    if (scrollEl) {
      scrollEl.removeEventListener("scroll", onScroll, true);
      scrollEl = null;
    }
    if (container) {
      scrollEl = container;
      container.addEventListener("scroll", onScroll, true);
      scheduleUpdate();
    }
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("resize", onScroll);
  scheduleUpdate();
});

onBeforeUnmount(() => {
  unbindEditorEvents();
  if (scrollEl) {
    scrollEl.removeEventListener("scroll", onScroll, true);
  }
  window.removeEventListener("resize", onScroll);
});
</script>
