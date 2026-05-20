import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import { normalizeColor } from "@/utils/color";
import { createCommandRunner } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/core";

const DEFAULT_TEXT_COLOR = "#000000";
const DEFAULT_BG_COLOR = "transparent";

export function useEditorColorState(editor: MaybeRefOrGetter<Editor | null>) {
  const currentTextColor = ref(DEFAULT_TEXT_COLOR);
  const currentBgColor = ref(DEFAULT_BG_COLOR);

  const runCommand = createCommandRunner(editor);

  function syncColorFromSelection() {
    const e = toValue(editor);
    if (!e) return;

    const textStyleAttrs = e.getAttributes("textStyle") as { color?: string };
    currentTextColor.value = textStyleAttrs?.color
      ? normalizeColor(textStyleAttrs.color)
      : DEFAULT_TEXT_COLOR;

    if (e.isActive("highlight")) {
      const highlightAttrs = e.getAttributes("highlight") as { color?: string };
      currentBgColor.value = highlightAttrs?.color
        ? normalizeColor(highlightAttrs.color)
        : DEFAULT_BG_COLOR;
    } else {
      currentBgColor.value = DEFAULT_BG_COLOR;
    }
  }

  function setupEditorSubscriptions() {
    cleanupEditorSubscriptions();
    const e = toValue(editor);
    if (!e) return;

    syncColorFromSelection();
    e.on("selectionUpdate", syncColorFromSelection);
    e.on("transaction", syncColorFromSelection);
    e.on("update", syncColorFromSelection);
  }

  function cleanupEditorSubscriptions() {
    const e = toValue(editor);
    if (!e) return;
    try {
      e.off("selectionUpdate", syncColorFromSelection);
      e.off("transaction", syncColorFromSelection);
      e.off("update", syncColorFromSelection);
    } catch {
      // 忽略取消订阅时的错误
    }
  }

  watch(() => toValue(editor), setupEditorSubscriptions, { immediate: true });

  onBeforeUnmount(() => {
    cleanupEditorSubscriptions();
  });

  const setTextColor = (color: string) => {
    currentTextColor.value = color;
    runCommand((chain) => chain.setColor(color))();
  };

  const setHighlight = (color: string) => {
    currentBgColor.value = color;
    runCommand((chain) => chain.setHighlight({ color }))();
  };

  return {
    currentTextColor,
    currentBgColor,
    setTextColor,
    setHighlight,
  };
}
