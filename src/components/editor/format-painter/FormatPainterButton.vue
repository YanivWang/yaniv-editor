<template>
  <ToolbarButton
    :icon="FormatPainterOutlined"
    :title="t('editor.formatPainter')"
    :active="isFormatPainterActive"
    :disabled="isDisabled"
    @click="toggleFormatPainter"
    @dblclick="toggleFormatPainterContinuous"
  />
</template>

<script setup lang="ts">
/**
 * FormatPainterButton - 格式刷按钮组件
 * @description 可复用的格式刷按钮组件，提供格式采样和应用功能
 * 支持单击单次模式和双击连续模式
 */
import { FormatPainterOutlined } from "@ant-design/icons-vue";
import { computed, ref, watch, onBeforeUnmount } from "vue";

import { ToolbarButton } from "@/components/base";
import { useOverlayFeedback } from "@/composables/useOverlayFeedback";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import type { FormatPainterStorage } from "@/extensions/formatPainter";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();
const feedback = useOverlayFeedback();

// ===== Props =====
interface Props {
  editor?: Editor | null;
  /** 外部传入的禁用状态 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: undefined,
});
const editor = useYanivEditor(() => props.editor);

// ===== 禁用状态检查 =====
/**
 * 计算是否禁用格式刷
 */
const isDisabled = computed(() => {
  return Boolean(props.disabled);
});

// ===== 格式刷状态管理 =====
/**
 * 获取格式刷存储对象
 */
function getFormatPainterStorage(): FormatPainterStorage | undefined {
  return editor.value?.storage.formatPainter;
}

// 使用响应式 ref 订阅编辑器事件，确保激活态能实时更新
const isFormatPainterActive = ref(false);

/**
 * 更新格式刷激活状态
 */
function updateFormatPainterActive() {
  const storage = getFormatPainterStorage();
  isFormatPainterActive.value = Boolean(storage?.isActive);
}

/** `props.editor` 用的是 @tiptap/vue-3 的 Editor，而 useYanivEditor 交出的是 core 的 */
type BoundEditor = NonNullable<typeof editor.value>;

/** 订阅会引起格式刷状态变化的事件 */
function attachFormatPainterListeners(e: BoundEditor | null) {
  if (!e) return;
  updateFormatPainterActive();
  // 只订 `transaction`（不变量 37）。格式刷的 `startFormatPainting` / `cancelFormatPainting`
  // 只改 storage 不动 `tr`，但 tiptap 仍会为每次 command dispatch 一个事务，
  // 因此 ESC 退出、mouseup 自动应用这些路径照样能收到通知（实测）。
  e.on("transaction", updateFormatPainterActive);
}

/** 退订指定编辑器上的监听 */
function detachFormatPainterListeners(e: BoundEditor | null) {
  if (!e) return;
  e.off("transaction", updateFormatPainterActive);
}

/**
 * 退订必须针对**上一个**编辑器实例。
 *
 * 此前是 `watch(editor, setupSubscriptions)`，而 setup 里读的是 `editor.value`——
 * 回调触发时它已经是新实例，于是 `off()` 全打在刚换上的实例上（那上面还没有监听），
 * 旧实例的三个监听一个也没摘掉。同 `OutlinePanel` 的写法，用 watch 的 prev 参数。
 */
watch(
  editor,
  (next, prev) => {
    detachFormatPainterListeners(prev ?? null);
    attachFormatPainterListeners(next ?? null);
  },
  { immediate: true },
);

// 组件卸载时清理订阅
onBeforeUnmount(() => {
  detachFormatPainterListeners(editor.value ?? null);
});

// ===== 格式刷命令 =====
/**
 * 双击开始前的模式，供 `dblclick` 判定这次双击是「进入连续」还是「退出」。
 *
 * DOM 规范里 `dblclick` 之前必然先发两次 `click`，所以 dblclick 跑到时
 * storage 已经被第一次 click 改过一轮，读它得不到用户按下去之前的状态。
 */
type PainterMode = "off" | "once" | "continuous";
let modeBeforeClick: PainterMode = "off";

function readPainterMode(): PainterMode {
  const storage = getFormatPainterStorage();
  if (!storage?.isActive) return "off";
  return storage.isContinuous ? "continuous" : "once";
}

/**
 * 单击切换格式刷（单次模式）
 * @description 单击格式刷按钮，采样格式或应用格式
 */
function toggleFormatPainter(event?: MouseEvent) {
  // 双击序列的第二次 click 直接跳过：否则「采样→取消→连续」三步会连弹 3 个 toast。
  // `detail` 由规范保证（第一次 1、第二次 2），不需要给单击加双击窗口的延迟。
  if (event && event.detail >= 2) return;

  const e = editor.value;
  if (!e) return;

  modeBeforeClick = readPainterMode();

  // 检查是否禁用，如果禁用则提示
  if (isDisabled.value) {
    feedback.toast(t("editor.formatPainterDisabled"), "warning");
    return;
  }

  const active = e.storage.formatPainter?.isActive ?? false;

  if (!active) {
    // 格式刷未激活：检查是否有选中内容
    try {
      const selection = e.state.selection;
      if (!selection || selection.empty) {
        feedback.toast(t("editor.formatPainterSelectTextFirst"), "warning");
        return;
      }
    } catch (error) {
      feedback.toast(t("editor.formatPainterSelectTextHint"), "warning");
      return;
    }

    // 采样格式并激活格式刷（单次模式）
    const success = e.commands.startFormatPainting();
    if (success) {
      feedback.toast(t("editor.formatPainterAppliedOnce"), "success");
      updateFormatPainterActive();
    }
  } else {
    // 格式刷已激活：取消格式刷状态
    e.commands.cancelFormatPainting();
    updateFormatPainterActive();
    feedback.toast(t("editor.formatPainterExited"), "info");
  }
}

/**
 * 双击切换格式刷连续应用模式
 * @description 双击格式刷按钮，开启连续应用模式
 *
 * 判定看的是 `modeBeforeClick`（双击**开始前**的模式），不是当前 storage：
 * 第一次 click 已经把状态改过一轮了。
 * - 双击前是连续模式 → 这次双击是「退出」，第一次 click 已经取消完，这里什么也不做
 * - 其余情况 → 进入连续模式
 */
function toggleFormatPainterContinuous() {
  const e = editor.value;
  if (!e) return;

  // 检查是否禁用，如果禁用则提示
  if (isDisabled.value) {
    feedback.toast(t("editor.formatPainterDisabled"), "warning");
    return;
  }

  if (modeBeforeClick === "continuous") {
    modeBeforeClick = "off";
    updateFormatPainterActive();
    return;
  }
  modeBeforeClick = "off";

  // 检查是否有选中内容
  try {
    const selection = e.state.selection;
    if (!selection || selection.empty) {
      feedback.toast(t("editor.formatPainterDoubleClickSelect"), "warning");
      return;
    }
  } catch (error) {
    feedback.toast(t("editor.formatPainterSelectTextHint"), "warning");
    return;
  }

  // 采样格式并激活格式刷（连续模式）。第一次 click 若已以单次模式激活，这里直接覆盖为连续。
  const success = e.commands.startContinuousFormatPainting();
  if (success) {
    feedback.toast(t("editor.formatPainterAppliedMulti"), "success");
    updateFormatPainterActive();
  }
}
</script>
