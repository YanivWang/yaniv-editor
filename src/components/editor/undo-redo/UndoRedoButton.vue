<template>
  <ToolbarGroup>
    <ToolbarButton
      :icon="UndoOutlined"
      :title="t('editor.undo')"
      :disabled="disabled || !canUndo"
      @click="undo"
    />
    <ToolbarButton
      :icon="RedoOutlined"
      :title="t('editor.redo')"
      :disabled="disabled || !canRedo"
      @click="redo"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * UndoRedoButton - 撤销/重做按钮组件
 * @description 可复用的撤销/重做按钮组件，提供撤销和重做功能
 */
import { UndoOutlined, RedoOutlined } from "@ant-design/icons-vue";
import { onBeforeUnmount, ref, watch } from "vue";

import { ToolbarButton, ToolbarGroup } from "@/components/base";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { createCommandRunner } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

// ===== Props =====
interface Props {
  editor?: Editor | null;
  /** 是否禁用按钮 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});
const editor = useYanivEditor(() => props.editor);

// ===== 工具函数 =====
const runCommand = createCommandRunner(editor);

// ===== 撤销/重做状态管理 =====
/**
 * 使用响应式 ref 存储撤销/重做状态，确保实时更新
 */
const canUndo = ref(false);
const canRedo = ref(false);

/**
 * 按钮可用性**只能**由编辑器自己的 `can()` 决定，不能再叠组件本地状态。
 *
 * 此前叠了一个 `hasRealEdit`（首次 `update` 事件才置 true），本意是挡「初始化时的误判」。
 * 但那个场景不存在——刚建好的编辑器 `can().undo()` 本来就是 false；
 * 而它挡住了真正该放行的场景：`mode` 在 edit/preview 间往返会重挂整个编辑 chrome，
 * 编辑器实例与历史都还在，重挂出来的按钮却因为本地标记归零而变灰。
 * 编辑器的持久状态不能存在组件本地。证据见同目录测试。
 */
function updateUndoRedoState() {
  const e = editor.value;
  if (!e) {
    canUndo.value = false;
    canRedo.value = false;
    return;
  }

  try {
    canUndo.value = Boolean(e.can().undo?.());
    canRedo.value = Boolean(e.can().redo?.());
  } catch (error) {
    // 如果检查失败，默认禁用按钮
    canUndo.value = false;
    canRedo.value = false;
  }
}

type BoundEditor = NonNullable<typeof editor.value>;

/**
 * 订阅编辑器状态变化。
 *
 * 这里**不能**再包一层 `nextTick`：订阅要等到下一个 tick 才真正发生，而
 * `onBeforeUnmount` 与换实例的退订都跑在此之前，于是退订摘了个空、
 * 随后 tick 里又把监听挂到一个已被弃用（甚至已销毁）的实例上，永远摘不掉。
 * 编辑器是父组件建好后才传进来的，取状态不需要额外等待；
 * `updateUndoRedoState` 自身也有兜底。
 */
function attachEditorListeners(e: BoundEditor | null) {
  if (!e) return;

  updateUndoRedoState();

  // `update` / `selectionUpdate` 都是 `transaction` 的严格子集，
  // 同时订多个只会让状态白算一遍（不变量 37）
  e.on("transaction", updateUndoRedoState);
}

/** 退订指定编辑器上的监听 */
function detachEditorListeners(e: BoundEditor | null) {
  if (!e) return;
  e.off("transaction", updateUndoRedoState);
}

/**
 * 退订必须针对**上一个**实例（不变量 24）。
 *
 * 此前退订函数读的是 `editor.value`——回调触发时已是新实例，三次 `off()` 全打空。
 * 另外原来还订阅了 `create`：编辑器由父组件构造完才传进来，`create` 早已 emit 过，
 * 那个回调**永远不会执行**；它又是匿名函数，而退订写的是
 * `off("create", updateUndoRedoState)`（另一个引用），于是每换一次实例就多攒一个
 * 摘不掉的监听（实测 create 回调数 2 → 4 → 5 单调增长）。已整体删除。
 */
watch(
  editor,
  (next, prev) => {
    detachEditorListeners(prev ?? null);
    attachEditorListeners(next ?? null);
  },
  { immediate: true },
);

// 组件卸载时清理订阅
onBeforeUnmount(() => {
  detachEditorListeners(editor.value ?? null);
});

// ===== 撤销/重做命令 =====
/**
 * 撤销命令
 * @description 执行撤销操作，回退到上一个编辑状态
 */
const undo = runCommand((chain) => chain.undo());

/**
 * 重做命令
 * @description 执行重做操作，恢复到撤销前的状态
 */
const redo = runCommand((chain) => chain.redo());
</script>
