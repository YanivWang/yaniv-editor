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

import { useOverlayMountTarget } from "@/composables/useOverlayMount";
import { CODE_LANGUAGES, DEFAULT_CODE_BLOCK_LANGUAGE } from "@/configs/editorConstants";
import { useYanivEditor } from "@/core/editorContext";
import { Select as ASelect } from "@/shared/antd";

import { findCodeBlockDepth, updateCodeBlockLanguage } from "./codeBlockUtils";

import type { Editor } from "@tiptap/core";
import type { SelectValue } from "ant-design-vue/es/select";

interface Props {
  editor?: Editor | null;
  container?: HTMLElement | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

const visible = ref(false);
const badgeStyle = ref<Record<string, string>>({ top: "0", left: "0" });

const languageOptions = CODE_LANGUAGES.map((lang) => ({
  value: lang,
  label: lang,
}));

const currentLanguage = computed(() => {
  const lang = editor.value?.getAttributes("codeBlock")?.language;
  return typeof lang === "string" && lang ? lang : DEFAULT_CODE_BLOCK_LANGUAGE;
});

const getPopupContainer = useOverlayMountTarget();

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
  const e = editor.value;
  const container = props.container;
  if (!e?.view || !container) {
    visible.value = false;
    return;
  }

  const pre = findActivePre(e);
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

let pendingFrame: number | null = null;

/**
 * 句柄必须留着：卸载时若不取消，排队中的回调仍会跑 `updatePosition`，
 * 而那时编辑器可能已 destroy——销毁后访问 `editor.view` 是直接抛错的（不变量 15）。
 */
function scheduleUpdate() {
  if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    updatePosition();
  });
}

function onLanguageChange(value: SelectValue) {
  if (typeof value !== "string" || !value) return;
  const e = editor.value;
  if (!e) return;
  updateCodeBlockLanguage(e, value);
  scheduleUpdate();
}

function bindEditorEvents(e: Editor | null) {
  if (!e) return;
  e.on("transaction", scheduleUpdate);
}

function unbindEditorEvents(e: Editor | null) {
  if (!e) return;
  e.off("transaction", scheduleUpdate);
}

let scrollEl: HTMLElement | null = null;

function onScroll() {
  scheduleUpdate();
}

/**
 * 退订要拿 watch 的 `prev` 去调，不能在退订函数里就地读 `editor.value`——
 * 回调触发时它已经是 `next`，`if (prev)` 只是个存在性判断，摘的仍是新实例。
 * 见 ARCHITECTURE 不变量 24。
 */
watch(
  () => editor.value,
  (next, prev) => {
    unbindEditorEvents(prev ?? null);
    if (next) {
      bindEditorEvents(next);
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
  if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
  unbindEditorEvents(editor.value ?? null);
  if (scrollEl) {
    scrollEl.removeEventListener("scroll", onScroll, true);
  }
  window.removeEventListener("resize", onScroll);
});
</script>
