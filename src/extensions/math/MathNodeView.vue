<template>
  <NodeViewWrapper
    :class="[
      'math-node-wrapper',
      { 'is-block': node.attrs.block, 'is-editing': isEditing, 'is-selected': selected },
    ]"
    :as="node.attrs.block ? 'div' : 'span'"
  >
    <!-- 编辑模式 -->
    <div v-if="isEditing" class="math-editor">
      <textarea
        ref="textareaRef"
        v-model="latexInput"
        class="math-editor__input"
        :aria-label="t('editor.mathLatexInput')"
        :placeholder="t('editor.mathPlaceholder')"
        @keydown.enter.ctrl="saveAndClose"
        @keydown.enter.meta="saveAndClose"
        @keydown.escape="cancelEdit"
        @blur="handleBlur"
      />
      <div class="math-editor__preview">
        <span v-if="renderError" class="math-error">{{ renderError }}</span>
        <span v-else v-html="previewHtml" />
      </div>
      <div class="math-editor__actions">
        <button type="button" class="math-btn math-btn--cancel" @click="cancelEdit">
          {{ t("editor.cancel") }}
        </button>
        <button type="button" class="math-btn math-btn--save" @click="saveAndClose">
          {{ t("editor.accept") }}
        </button>
      </div>
    </div>

    <!-- 显示模式 -->
    <button
      v-else
      type="button"
      class="math-display"
      :class="{ 'math-empty': !node.attrs.latex }"
      :aria-label="t('editor.mathEdit')"
      @dblclick="startEdit"
      @click="handleClick"
      @keydown.enter.prevent="startEdit"
      @keydown.space.prevent="startEdit"
      v-html="displayHtml"
    />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { ref, computed, watch, nextTick, onMounted } from "vue";

/* KaTeX 样式由接入方引入: import 'katex/dist/katex.min.css'（勿打入 npm 包） */
import { useEditorT } from "@/core/infra/useEditorLocale";

import { renderMath } from "./renderMath";

import type { MathExtensionOptions } from "./types";

const t = useEditorT();

const props = defineProps(nodeViewProps);

const isEditing = ref(false);
const latexInput = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const katexOptions = computed(
  () => (props.extension?.options as MathExtensionOptions | undefined)?.katexOptions,
);

/**
 * 渲染结果一律走纯函数派生，不在 computed 里写 ref。
 * `t()` 必须在 computed 内部求值，否则语言切换后占位文案会冻结在首次求值的语言上。
 */
function render(latex: unknown) {
  return renderMath(latex, props.node.attrs.block, katexOptions.value, t("editor.mathEmpty"));
}

// 显示模式
const displayResult = computed(() => render(props.node.attrs.latex));
const displayHtml = computed(() => displayResult.value.html);

// 编辑模式预览
const previewResult = computed(() => render(latexInput.value));
const previewHtml = computed(() => previewResult.value.html);

/** 编辑态看预览的错误，显示态看公式本身的错误——两者都随输入实时消长，不会粘住 */
const renderError = computed(() =>
  isEditing.value ? previewResult.value.error : displayResult.value.error,
);

// 开始编辑
function startEdit() {
  if (props.editor?.isEditable === false) return;

  isEditing.value = true;
  latexInput.value = props.node.attrs.latex || "";

  nextTick(() => {
    textareaRef.value?.focus();
    textareaRef.value?.select();
  });
}

// 保存并关闭
function saveAndClose() {
  if (latexInput.value !== props.node.attrs.latex) {
    props.updateAttributes({ latex: latexInput.value });
  }
  isEditing.value = false;
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false;
  latexInput.value = props.node.attrs.latex || "";
}

// 处理失焦
function handleBlur(e: FocusEvent) {
  // 如果点击的是编辑器内的按钮，不要关闭
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (relatedTarget?.closest(".math-editor")) {
    return;
  }
  saveAndClose();
}

/**
 * 单击选中、双击编辑；键盘 Enter / Space 直接进编辑。
 *
 * 这个 `<button>` 的可访问名是「编辑公式」，而键盘激活它原先只会选中节点
 * ——名不符实，且键盘用户**根本没有进入编辑的路径**（双击没有键盘等价物）。
 * 鼠标那两条交互保持不变。
 */
function handleClick() {
  const pos = props.getPos();
  if (typeof pos === "number") {
    props.editor?.commands.setNodeSelection(pos);
  }
}

// 如果是新建的空公式，自动进入编辑模式
onMounted(() => {
  if (!props.node.attrs.latex && props.editor?.isEditable) {
    startEdit();
  }
});

// 监听节点变化
watch(
  () => props.node.attrs.latex,
  (newLatex) => {
    if (!isEditing.value) {
      latexInput.value = newLatex || "";
    }
  },
);
</script>

<style>
.math-node-wrapper {
  position: relative;
  display: inline;
}

.math-node-wrapper.is-block {
  display: block;
  margin: 1em 0;
  text-align: center;
}

/* 显示模式 */
.math-display {
  /*
   * 由 span 改为 button 以获得原生键盘可达性，需重置浏览器默认按钮样式。
   * 这组重置必须留在基础选择器上：早先它被写在 `.is-selected` 里，
   * 于是未选中的公式一直顶着 UA 的按钮外观（灰底、outset 边框、非继承字体）。
   */
  display: inline-block;
  padding: 2px 4px;
  font: inherit;
  color: inherit;
  text-align: inherit;
  appearance: none;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.math-node-wrapper.is-selected .math-display {
  outline: 2px solid var(--ye-primary);
  outline-offset: 2px;
}

.math-display:hover {
  background-color: rgba(24, 144, 255, 0.1);
}

.math-node-wrapper.is-block .math-display {
  display: block;
  padding: 8px 16px;
}

.math-empty {
  font-style: italic;
  color: var(--ye-text-muted);
}

.math-placeholder {
  font-style: italic;
  color: var(--ye-text-muted);
}

.math-error {
  font-size: 12px;
  color: #cc0000;
}

/* 编辑模式 */
.math-editor {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
  min-width: 300px;
  padding: 12px;
  background: var(--ye-bg);
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.math-node-wrapper.is-block .math-editor {
  display: flex;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.math-editor__input {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  font-family: "Fira Code", Monaco, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ye-text);
  resize: vertical;
  outline: none;
  background: var(--ye-bg-secondary);
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 4px;
}

.math-editor__input:focus {
  border-color: var(--ye-primary);
}

.math-editor__preview {
  min-height: 40px;
  padding: 8px;
  text-align: center;
  background: var(--ye-bg-secondary);
  border-radius: 4px;
}

.math-editor__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.math-btn {
  padding: 4px 12px;

  /* <button>，需重置浏览器默认按钮样式：按钮不继承 font-family */
  font: inherit;
  font-size: 13px;
  line-height: normal;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.math-btn--cancel {
  color: var(--ye-text);
  background: var(--ye-bg-secondary);
}

.math-btn--cancel:hover {
  background: var(--ye-border);
}

.math-btn--save {
  color: #fff;
  background: var(--ye-primary);
}

.math-btn--save:hover {
  background: #40a9ff;
}

/* 深色模式 */
[data-color-mode="dark"] .math-editor {
  background: #1f1f1f;
  border-color: #404040;
}

[data-color-mode="dark"] .math-editor__input {
  color: #e5e5e5;
  background: #2d2d2d;
  border-color: #404040;
}

[data-color-mode="dark"] .math-editor__preview {
  background: #2d2d2d;
}

[data-color-mode="dark"] .math-btn--cancel {
  color: #e5e5e5;
  background: #2d2d2d;
}

[data-color-mode="dark"] .math-btn--cancel:hover {
  background: #404040;
}
</style>
