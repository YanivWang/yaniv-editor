import { ref, watch, type Ref } from "vue";

import { normalizeColor } from "@/utils/color";
import { createCommandRunner } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

export function useEditorColorState(editor: Ref<Editor | null>) {
  const currentTextColor = ref("#000000");
  const currentBgColor = ref("#ffffff");

  const runCommand = createCommandRunner(editor);

  watch(
    () => editor.value?.getAttributes("textStyle"),
    (attrs) => {
      currentTextColor.value = attrs?.color ? normalizeColor(attrs.color) : "#000000";
    },
    { deep: true, immediate: true },
  );

  watch(
    () => editor.value?.getAttributes("highlight"),
    (attrs) => {
      currentBgColor.value = attrs?.color ? normalizeColor(attrs.color) : "#ffffff";
    },
    { deep: true, immediate: true },
  );

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
