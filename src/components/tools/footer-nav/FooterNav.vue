<template>
  <div class="footer-nav-container">
    <ZoomBar
      v-model:zoom-level="localZoomLevel"
      :total-pages="totalPages"
      :show-char-count="showCharCount"
      :show-shortcut-hints="showShortcutHints"
      :min="min"
      :max="max"
      :step="step"
      :placement="placement"
      @update:zoom-level="handleZoomUpdate"
      @change="handleZoomChange"
      @reset="handleZoomReset"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * FooterNav - 底部导航组件
 * @description 薄封装层：把缩放 / 页数 / 字数统计等 props 透传给 ZoomBar，
 * 并把 ZoomBar 的缩放事件冒泡给宿主。自身不含业务逻辑。
 * @example
 * ```vue
 * <FooterNav
 *   v-model:zoom-level="zoomLevel"
 *   :total-pages="totalPages"
 *   :show-char-count="true"
 *   :show-shortcut-hints="chrome.showStatusHints"
 *   :placement="presetLayout.zoomPlacement"
 * />
 * ```
 */
import { ref, watch } from "vue";

import { ZoomBar } from "@/components/editor/zoom";

// ===== Props =====
interface Props {
  /** 当前缩放比例（双向绑定） */
  zoomLevel: number;
  /** 文档总页数 */
  totalPages: number;
  /** 是否显示字数统计 */
  showCharCount?: boolean;
  /** 是否显示常用快捷键提示（底部状态区） */
  showShortcutHints?: boolean;
  /** 最小缩放比例 */
  min?: number;
  /** 最大缩放比例 */
  max?: number;
  /** 缩放步长 */
  step?: number;
  /** 缩放条位置，透传给 ZoomBar；来源为 preset 的 layout.zoomPlacement */
  placement?: "bottom" | "belowToolbar";
}

const props = withDefaults(defineProps<Props>(), {
  min: 50,
  max: 200,
  step: 10,
  showCharCount: true,
  showShortcutHints: false,
  placement: "bottom",
});

// ===== Emits =====
const emit = defineEmits<{
  (e: "update:zoomLevel", value: number): void;
  (e: "change", value: number): void;
  (e: "reset", value: number): void;
}>();

// ===== 响应式状态 =====
const localZoomLevel = ref(props.zoomLevel);

// ===== 监听外部 zoomLevel 变化 =====
watch(
  () => props.zoomLevel,
  (newValue) => {
    if (localZoomLevel.value !== newValue) {
      localZoomLevel.value = newValue;
    }
  },
  { immediate: true },
);

// ===== 事件处理 =====
/**
 * 处理缩放更新
 */
const handleZoomUpdate = (value: number) => {
  localZoomLevel.value = value;
  emit("update:zoomLevel", value);
};

/**
 * 处理缩放变化
 */
const handleZoomChange = (value: number) => {
  emit("change", value);
};

/**
 * 处理缩放重置
 */
const handleZoomReset = (value: number) => {
  emit("reset", value);
};
</script>

<style lang="scss" scoped>
/* ===== 底部导航容器 ===== */
.footer-nav-container {
  position: relative; /* 确保定位上下文 */
  display: block; /* 确保显示 */
  flex-shrink: 0;
  width: 100%;
}
</style>
