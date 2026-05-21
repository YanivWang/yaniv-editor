<template>
  <ToolbarDropdownButton
    :label="currentFontSizeName"
    :title="t('editor.fontSize')"
    :items="dropdownItems"
    placement="bottomLeft"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { ToolbarDropdownButton } from "@/components/base";
import { FONT_SIZES, DEFAULT_VALUES } from "@/configs/editorConstants";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import { createCommandRunner, executeBatchCommands } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

const runCommand = createCommandRunner(editor);

const currentFontSize = ref<string>(DEFAULT_VALUES.fontSize);

const currentFontSizeName = computed(() => {
  const found = FONT_SIZES.find((s) => s.value === currentFontSize.value);
  return found?.label ?? currentFontSize.value;
});

watch(
  () => editor.value?.getAttributes("textStyle")?.fontSize,
  (fontSize) => {
    currentFontSize.value = fontSize || DEFAULT_VALUES.fontSize;
  },
  { deep: true, immediate: true },
);

function applyFontSize(val: string) {
  const e = editor.value;
  if (!e) return;

  currentFontSize.value = val;

  const { from, to, empty } = e.state.selection;
  if (empty) {
    const $from = e.state.selection.$from;
    const start = $from.start($from.depth);
    const end = $from.end($from.depth);
    executeBatchCommands(editor, [
      (chain) => chain.setTextSelection({ from: start, to: end }),
      (chain) => chain.setMark("textStyle", { fontSize: val }),
      (chain) => chain.setTextSelection({ from, to }),
    ]);
  } else {
    runCommand((chain) => chain.setMark("textStyle", { fontSize: val }))();
  }
}

const dropdownItems = computed<MenuItemConfig[]>(() =>
  FONT_SIZES.map((size) => ({
    key: size.value,
    label: size.label,
    active: currentFontSize.value === size.value,
    action: () => applyFontSize(size.value),
  })),
);
</script>
