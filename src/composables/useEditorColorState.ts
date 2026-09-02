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

  function attachEditorListeners(e: Editor | null) {
    if (!e) return;
    syncColorFromSelection();
    // 只订 `transaction`：颜色只依赖选区上的 mark，而 transaction 是另两个事件的超集（不变量 37）
    e.on("transaction", syncColorFromSelection);
  }

  function detachEditorListeners(e: Editor | null) {
    if (!e) return;
    e.off("transaction", syncColorFromSelection);
  }

  /**
   * 退订必须针对**上一个**实例：watch 回调触发时 `toValue(editor)` 已是新实例，
   * 在退订函数里就地取值只会打在刚换上的实例上，旧实例的三个监听一个也摘不掉。
   * 见 ARCHITECTURE 不变量 24。
   */
  watch(
    () => toValue(editor),
    (next, prev) => {
      detachEditorListeners(prev ?? null);
      attachEditorListeners(next ?? null);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    detachEditorListeners(toValue(editor));
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
