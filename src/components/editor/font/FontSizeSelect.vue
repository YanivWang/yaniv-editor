<template>
  <a-select
    v-model:value="currentFontSize"
    :placeholder="t('toolbar.fontSize')"
    class="font-size-select"
    :dropdown-match-select-width="true"
    option-label-prop="label"
    popup-class-name="font-size-select-dropdown"
    @change="onFontSizeChange"
  >
    <a-select-option
      v-for="size in FONT_SIZES"
      :key="size.value"
      :value="size.value"
      :label="size.label"
    >
      {{ size.label }}
    </a-select-option>
  </a-select>
</template>

<script setup lang="ts">
/**
 * FontSizeSelect - 字号选择器组件
 * @description 可复用的字号选择器组件，支持选择字号大小
 */
import { ref, watch } from "vue";

import { FONT_SIZES, DEFAULT_VALUES } from "@/configs/editorConstants";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import { createCommandRunner, executeBatchCommands } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

// ===== Props =====
interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

// ===== 工具函数 =====
const runCommand = createCommandRunner(editor);

// ===== 响应式状态 =====
const currentFontSize = ref<string>(DEFAULT_VALUES.fontSize);

// ===== 监听编辑器状态，更新当前字号 =====
watch(
  () => editor.value?.getAttributes("textStyle")?.fontSize,
  (fontSize) => {
    if (fontSize) {
      currentFontSize.value = fontSize;
    } else {
      currentFontSize.value = DEFAULT_VALUES.fontSize;
    }
  },
  { deep: true, immediate: true },
);

/**
 * 字号切换处理
 * @description 如果无选区则应用到整个段落，有选区则应用到选区
 */
function onFontSizeChange(val: string) {
  const e = editor.value;
  if (!e) return;

  currentFontSize.value = val;

  const { from, to, empty } = e.state.selection;
  if (empty) {
    // 无选区时：选中整个段落并应用字号
    const $from = e.state.selection.$from;
    const start = $from.start($from.depth);
    const end = $from.end($from.depth);
    executeBatchCommands(editor, [
      (chain) => chain.setTextSelection({ from: start, to: end }),
      (chain) => chain.setMark("textStyle", { fontSize: val }),
      (chain) => chain.setTextSelection({ from, to }),
    ]);
  } else {
    // 有选区时：直接应用到选区
    runCommand((chain) => chain.setMark("textStyle", { fontSize: val }))();
  }
}
</script>

<style scoped>
.font-size-select {
  width: 60px;
  min-width: 60px;
  margin-inline-start: 4px;
  font-size: 12px;

  :deep(.ant-select-selector) {
    padding: 0 24px 0 8px !important;
    font-size: 12px;
  }

  :deep(.ant-select-selection-wrap) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-placeholder) {
    flex: 1;
    max-width: none !important;
    padding-inline-end: 0 !important;
    overflow: visible !important;
    text-overflow: clip !important;
    font-size: 12px;
    line-height: 1.2;
    text-align: center;
  }

  :deep(.ant-select-selection-search-input) {
    text-align: center;
  }

  :deep(.ant-select-arrow) {
    height: 10px;
    margin-top: -5px;
    font-size: 10px;

    .anticon {
      font-size: 10px;
    }
  }
}
</style>

<style lang="scss">
.font-size-select-dropdown {
  .ant-select-item {
    justify-content: center;
  }

  .ant-select-item-option-content {
    text-align: center;
  }
}
</style>
