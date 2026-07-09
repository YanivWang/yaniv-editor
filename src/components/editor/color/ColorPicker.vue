<!--
  ColorPicker - 颜色选择器组件
  @description 用于文本编辑器中选择文字颜色或背景颜色的组件
  @features
    - 支持文字颜色和背景颜色两种模式
    - 使用 Popover 弹出层展示颜色选择面板
    - 提供常用颜色网格（默认20个颜色，每行5个）
    - 支持清空颜色功能
    - 预览区域根据类型显示文字颜色或背景颜色效果
-->
<template>
  <!-- 使用 Ant Design Popover 组件实现弹出层 -->
  <Popover
    v-model:open="showPicker"
    trigger="click"
    placement="bottomLeft"
    overlay-class-name="ye-color-picker-popover"
  >
    <!-- Popover 内容：颜色选择面板 -->
    <template #content>
      <div class="ye-color-picker-content">
        <!-- 头部区域：颜色预览、标题、清空按钮 -->
        <div class="ye-color-picker-header">
          <!-- 当前颜色预览方块（可点击打开高级颜色选择器） -->
          <button
            class="ye-color-picker-preview-btn"
            type="button"
            :title="t('editor.showAdvanced')"
            @click.stop="showAdvancedPicker = true"
          >
            <div class="ye-color-picker-preview">
              <div
                class="ye-color-picker-preview-color"
                :style="{ backgroundColor: normalizedColor }"
              />
            </div>
          </button>
          <!-- 分隔线 -->
          <div class="ye-color-picker-separator" />
          <!-- 标题 -->
          <div class="ye-color-picker-title">{{ t("editor.colors") }}</div>
          <!-- 预览文字：根据类型显示文字颜色或背景颜色效果 -->
          <div
            class="ye-color-picker-preview-text"
            :class="{ 'is-background': type === 'background' }"
            :style="previewTextStyle"
          >
            A
          </div>
          <!-- 清空颜色按钮 -->
          <button
            class="ye-color-clear-btn"
            type="button"
            :title="t('editor.clearColor')"
            @click.stop="clearColor"
          >
            <StopOutlined class="ye-color-clear-icon" />
          </button>
        </div>

        <!-- 默认颜色网格 -->
        <div class="ye-color-picker-section">
          <div class="ye-color-picker-section-title">{{ t("editor.defaultColors") }}</div>
          <div class="ye-color-picker-grid" :style="gridStyle">
            <button
              v-for="color in activeColors"
              :key="color"
              :class="[
                'ye-color-picker__item',
                { 'is-selected': normalizedColor === normalizeColor(color) },
              ]"
              :style="{
                width: `${props.itemSize}px`,
                height: `${props.itemSize}px`,
                backgroundColor: color === 'transparent' ? '#fff' : color,
              }"
              type="button"
              :title="color"
              @click="handleSelectColor(color)"
            />
          </div>
        </div>

        <!-- 标准色 -->
        <div v-if="showStandardColors" class="ye-color-picker-section">
          <div class="ye-color-picker-section-title">{{ t("editor.standardColors") }}</div>
          <div class="ye-color-picker-grid" :style="standardGridStyle">
            <button
              v-for="color in STANDARD_COLORS"
              :key="color"
              :class="[
                'ye-color-picker__item',
                { 'is-selected': normalizedColor === normalizeColor(color) },
              ]"
              :style="{
                width: `${props.itemSize}px`,
                height: `${props.itemSize}px`,
                backgroundColor: color,
              }"
              type="button"
              :title="color"
              @click="handleSelectColor(color)"
            />
          </div>
        </div>

        <!-- 高级颜色选择器 -->
        <div v-if="showAdvancedPicker" class="ye-color-picker-advanced">
          <div class="ye-color-picker-advanced-header">
            <span class="ye-color-picker-advanced-title">{{ t("editor.showAdvanced") }}</span>
            <button
              class="ye-color-picker-advanced-close"
              type="button"
              :title="t('editor.hideAdvanced')"
              @click.stop="showAdvancedPicker = false"
            >
              ×
            </button>
          </div>
          <div class="ye-color-picker-advanced-content">
            <input
              v-model="advancedColor"
              type="color"
              class="ye-color-picker-color-input"
              @change="handleAdvancedColorChange"
            />
            <input
              v-model="advancedColor"
              type="text"
              class="ye-color-picker-color-text"
              placeholder="#000000"
              @input="handleAdvancedColorInput"
            />
          </div>
        </div>
      </div>
    </template>
    <!-- Popover 触发器：颜色选择按钮 -->
    <Tooltip :title="buttonTitle" placement="top" :open="showPicker ? false : undefined">
      <div
        class="ye-color-current-btn"
        :class="{
          'has-icon': icon,
          'is-text': icon && type === 'text',
          'is-background': icon && type === 'background',
        }"
      >
        <!-- 如果提供了图标，显示图标；否则显示颜色预览 -->
        <template v-if="icon">
          <span class="ye-color-icon-wrap">
            <component :is="icon" />
          </span>
          <span class="ye-color-indicator" :style="indicatorBarStyle" />
        </template>
        <div v-else class="ye-color-current-preview" />
      </div>
    </Tooltip>
  </Popover>
</template>

<script setup lang="ts">
import { StopOutlined } from "@ant-design/icons-vue";
import { Popover, Tooltip } from "ant-design-vue";
import { ref, computed, watch } from "vue";

import {
  NOTION_BACKGROUND_COLORS,
  NOTION_DEFAULT_HIGHLIGHT,
  NOTION_DEFAULT_TEXT,
  NOTION_TEXT_COLORS,
} from "@/appearance/notionColors";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { normalizeColor } from "@/utils/color";

import type { Component } from "vue";

const t = useEditorT();

/**
 * 组件 Props 接口定义
 */
interface Props {
  /** 颜色网格列数，默认 5 列 */
  columns?: number;
  /** 每个颜色块的大小（px），默认 20px */
  itemSize?: number;
  /** 当前选中的颜色值（v-model） */
  modelValue?: string;
  /** 颜色块之间的间距（px），默认 8px */
  gap?: number;
  /** 按钮图标组件（可选） */
  icon?: Component;
  /** 颜色类型：'text' 文字颜色 | 'background' 背景颜色 */
  type?: "text" | "background";
  /** 按钮标题（tooltip 显示文本，可选，默认根据 type 自动生成） */
  title?: string;
  /** 色板方案：office（默认）| notion */
  palette?: "office" | "notion";
}

const props = withDefaults(defineProps<Props>(), {
  columns: 10, // 10 列，适应更多颜色（50个颜色 = 5行 × 10列）
  itemSize: 20,
  modelValue: undefined,
  gap: 8,
  icon: undefined,
  type: "text",
  title: undefined,
  palette: "office",
});

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  /** 颜色值更新事件（v-model 支持） */
  (e: "update:modelValue", value: string | undefined): void;
  /** 颜色选择事件 */
  (e: "select", value: string): void;
}>();

/**
 * 默认颜色列表（50个常用颜色，按色彩用途分组，无重复）
 * @description 参考 Office 颜色选择器，每个主色一列，每列有多个色阶（从浅到深）
 * 数组按行优先排列：第1行（各列的第1个颜色）→ 第2行（各列的第2个颜色）→ ...
 *
 * 颜色列结构（10列 × 5行 = 50个颜色，每个颜色唯一）：
 * 列1: 白色系（#ffffff → #f5f5f5 → #d9d9d9 → #a6a6a6 → #000000）
 * 列2: 浅灰系（#f2f2f2 → #e6e6e6 → #cccccc → #999999 → #666666）
 * 列3: 灰色系（#e0e0e0 → #c0c0c0 → #808080 → #595959 → #404040）
 * 列4: 红色系（#ffcccc → #ff9999 → #ff6666 → #ff0000 → #990000）
 * 列5: 橙色系（#ffcc99 → #ff9966 → #ff9900 → #ff7700 → #cc6600）
 * 列6: 黄色系（#ffffcc → #ffff99 → #ffff00 → #ffd700 → #cccc00）
 * 列7: 绿色系（#ccffcc → #99ff99 → #66ff66 → #00ff00 → #006600）
 * 列8: 蓝色系（#cce5ff → #99ccff → #6699ff → #0066ff → #003366）
 * 列9: 紫色系（#e4d9ff → #ccb3ff → #9966ff → #6600cc → #330066）
 * 列10: 粉色系（#ffd9e6 → #ffb3cc → #ff6699 → #ff0066 → #cc0033）
 */
const DEFAULT_COLORS = [
  // 第1行：各列的最浅色（主色）
  "#ffffff",
  "#f2f2f2",
  "#e0e0e0",
  "#ffcccc",
  "#ffcc99",
  "#ffffcc",
  "#ccffcc",
  "#cce5ff",
  "#e4d9ff",
  "#ffd9e6",
  // 第2行：各列的浅色（80% 主色）
  "#f5f5f5",
  "#e6e6e6",
  "#c0c0c0",
  "#ff9999",
  "#ff9966",
  "#ffff99",
  "#99ff99",
  "#99ccff",
  "#ccb3ff",
  "#ffb3cc",
  // 第3行：各列的中等色（60% 主色）
  "#d9d9d9",
  "#cccccc",
  "#808080",
  "#ff6666",
  "#ff9900",
  "#ffff00",
  "#66ff66",
  "#6699ff",
  "#9966ff",
  "#ff6699",
  // 第4行：各列的深色（40% 主色）
  "#a6a6a6",
  "#999999",
  "#595959",
  "#ff0000",
  "#ff7700",
  "#ffd700",
  "#00ff00",
  "#0066ff",
  "#6600cc",
  "#ff0066",
  // 第5行：各列的最深色（20% 主色）
  "#000000",
  "#666666",
  "#404040",
  "#990000",
  "#cc6600",
  "#cccc00",
  "#006600",
  "#003366",
  "#330066",
  "#cc0033",
] as const;

const activeColors = computed(() => {
  if (props.palette !== "notion") {
    return props.type === "text" ? DEFAULT_COLORS : DEFAULT_COLORS;
  }
  return props.type === "text" ? NOTION_TEXT_COLORS : NOTION_BACKGROUND_COLORS;
});

const activeColumns = computed(() => (props.palette === "notion" ? 10 : props.columns));

const showStandardColors = computed(() => props.palette !== "notion");

/**
 * 标准颜色列表（10个标准色）
 * @description 参考 Office 颜色选择器，包含常用的标准颜色
 */
const STANDARD_COLORS = [
  "#c00000", // 深红
  "#ff6600", // 亮橙
  "#ffc000", // 亮黄
  "#92d050", // 浅绿
  "#00b050", // 标准绿
  "#00b0f0", // 浅蓝
  "#0070c0", // 青色
  "#0050d0", // 中蓝
  "#002060", // 深蓝
  "#7030a0", // 紫色
] as const;

const normalizedColor = computed(() => normalizeColor(props.modelValue));

/**
 * 按钮标题（tooltip 文本）
 * @description 如果提供了 title prop 则使用，否则根据 type 自动生成
 */
const buttonTitle = computed(() => {
  if (props.title) return props.title;
  return props.type === "text" ? t("editor.textColor") : t("editor.backgroundColor");
});

/**
 * 根据背景颜色计算合适的文字颜色
 * @description 使用感知亮度公式计算背景色亮度，自动返回黑色或白色文字以确保可读性
 * @param bgColor - 背景颜色值
 * @returns '#000' 或 '#fff' - 根据背景亮度返回合适的文字颜色
 *
 * @example
 * getTextColorForBackground('#ffffff') // 返回 '#000' (白色背景用黑字)
 * getTextColorForBackground('#000000') // 返回 '#fff' (黑色背景用白字)
 */
const getTextColorForBackground = (bgColor: string) => {
  // 处理透明或空值
  if (!bgColor || bgColor === "transparent") return "#000";

  // 移除 # 号
  let hex = bgColor.replace("#", "");

  // 支持 3 位十六进制格式（如 #fff）转换为 6 位（如 #ffffff）
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // 验证格式
  if (hex.length !== 6) return "#000";

  // 提取 RGB 分量
  const r = parseInt(hex.substr(0, 2), 16); // 红色分量 (0-255)
  const g = parseInt(hex.substr(2, 2), 16); // 绿色分量 (0-255)
  const b = parseInt(hex.substr(4, 2), 16); // 蓝色分量 (0-255)

  // 计算感知亮度（使用人眼对不同颜色的敏感度权重）
  // 公式：亮度 = (R × 299 + G × 587 + B × 114) / 1000
  // 绿色权重最高(587)，红色次之(299)，蓝色最低(114)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 使用更严格的阈值（120 而不是 128），确保更好的对比度
  // 亮度 > 120（浅色背景）返回黑色文字，否则返回白色文字
  return brightness > 120 ? "#000" : "#fff";
};

/**
 * 预览文字样式（计算属性）
 * @description 根据类型返回不同的样式：
 *   - text: 显示文字颜色
 *   - background: 显示背景颜色，并自动计算合适的文字颜色
 */
const previewTextStyle = computed(() => {
  if (props.type === "text") {
    // 文字颜色模式：直接应用颜色到文字
    return { color: normalizedColor.value };
  } else {
    // 背景颜色模式：应用背景色，并自动计算文字颜色
    return {
      backgroundColor: normalizedColor.value,
      color: getTextColorForBackground(normalizedColor.value),
    };
  }
});

/** 工具栏图标下方的当前颜色横条（与文字颜色图标底部色条一致） */
const indicatorBarStyle = computed(() => {
  const color = normalizedColor.value;
  if (!color || color === "transparent") {
    return { backgroundColor: "transparent" };
  }
  return { backgroundColor: color };
});

/**
 * 颜色网格样式（计算属性）
 * @description 根据 columns、itemSize 动态生成 CSS Grid 布局样式
 * @note gap 间距由 CSS 统一控制，不在此处设置
 * @example
 * columns=10, itemSize=20
 * 生成: { gridTemplateColumns: 'repeat(10, 20px)' }
 */
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${activeColumns.value}, ${props.itemSize}px)`,
}));

/**
 * 标准色网格样式（计算属性）
 * @description 标准色固定为10列，使用固定的 itemSize 确保对齐
 */
const standardGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(10, ${props.itemSize}px)`,
}));

/**
 * Popover 显示/隐藏状态
 */
const showPicker = ref(false);

/**
 * 高级颜色选择器显示/隐藏状态
 */
const showAdvancedPicker = ref(false);

/**
 * 高级颜色选择器的颜色值
 */
const advancedColor = ref(normalizedColor.value || "#000000");

// 监听 showAdvancedPicker，当打开时同步当前颜色
watch(showAdvancedPicker, (isOpen) => {
  if (isOpen) {
    advancedColor.value = normalizedColor.value || "#000000";
  }
});

/**
 * 统一触发颜色变化事件
 * @param color - 颜色值
 */
const updateColor = (color: string) => {
  emit("update:modelValue", color);
  emit("select", color);
};

/**
 * 处理颜色选择
 * @param color - 选中的颜色值
 */
const handleSelectColor = (color: string) => {
  updateColor(normalizeColor(color));
};

/**
 * 清空颜色
 * @description 根据类型返回默认值：
 *   - text: 恢复为黑色 '#000000'
 *   - background: 恢复为透明 'transparent'
 */
const clearColor = () => {
  if (props.type === "text") {
    updateColor(props.palette === "notion" ? NOTION_DEFAULT_TEXT : "#000000");
    return;
  }
  updateColor(props.palette === "notion" ? NOTION_DEFAULT_HIGHLIGHT : "transparent");
};

/**
 * 处理高级颜色选择器的颜色变化（color input）
 */
const handleAdvancedColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const color = normalizeColor(target.value);
  advancedColor.value = color;
  updateColor(color);
};

/**
 * 处理高级颜色选择器的文本输入
 */
const handleAdvancedColorInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  let color = target.value.trim();

  // 如果输入的值不是以 # 开头，自动添加
  if (color && !color.startsWith("#")) {
    color = "#" + color;
  }

  // 验证颜色格式
  if (/^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color)) {
    const normalized = normalizeColor(color);
    advancedColor.value = normalized;
    updateColor(normalized);
  }
};

// 监听 normalizedColor 变化，同步到 advancedColor
watch(normalizedColor, (newColor) => {
  if (showAdvancedPicker.value) {
    advancedColor.value = newColor;
  }
});
</script>

<style lang="scss" scoped>
// Dark 模式选择器变量（用于统一管理暗色样式）
$dark-selector: '[data-color-mode="dark"] &';

/* ===== 颜色选择按钮 ===== */
.ye-color-current-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  overflow: visible;
  color: var(--ye-toolbar-btn-text);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--ye-radius-sm);
  transition: all var(--ye-transition-normal);

  &.has-icon {
    gap: 2px;
    padding: 6px 0 5px;
  }

  &:hover {
    color: var(--ye-text);
    background: var(--ye-toolbar-btn-hover);
  }
}

/* 颜色预览区域（无图标时显示） */
.ye-color-current-preview {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}

/* 图标区域：固定尺寸，保证文字/背景色按钮上下对齐 */
.ye-color-icon-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 16px;
  line-height: 0;
  color: inherit;

  :deep(.color-icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 16px;
    line-height: 0;
  }

  :deep(.color-icon--text) {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
  }

  :deep(.color-icon--background .anticon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 0;
  }

  :deep(.color-icon--background .anticon svg) {
    display: block;
  }
}

/* 图标下方的当前色条 */
.ye-color-indicator {
  display: block;
  flex-shrink: 0;
  width: 16px;
  height: 3px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);

  #{$dark-selector} {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  }
}

/* ===== Popover 内容区域 ===== */
.ye-color-picker-content {
  min-width: 280px; /* 适配 10 列布局（10 × 20px + 9 × 6px + padding） */
  max-width: 320px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;

  #{$dark-selector} {
    background: #1f1f1f;
  }
}

/* 头部区域：颜色预览、标题、清空按钮 */
.ye-color-picker-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

/* 当前颜色预览方块容器 */
.ye-color-picker-preview {
  flex-shrink: 0;
  width: 40px;
  min-width: 40px;
  height: 24px;
  overflow: hidden;
  border: var(--ye-border-width) solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;

  #{$dark-selector} {
    border-color: rgba(255, 255, 255, 0.15);
  }
}

/* 当前颜色预览方块 */
.ye-color-picker-preview-color {
  width: 100%;
  height: 100%;
}

/* 分隔线 */
.ye-color-picker-separator {
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.08);

  #{$dark-selector} {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* 标题文字 */
.ye-color-picker-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #262626;

  #{$dark-selector} {
    color: #f0f0f0;
  }
}

/* 预览文字（显示文字颜色或背景颜色效果） */
.ye-color-picker-preview-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* 文字阴影增强可读性 */
  background: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  transition: all 0.2s;

  #{$dark-selector} {
    background: #1f1f1f;
    border-color: rgba(255, 255, 255, 0.25);
  }

  /* 背景颜色模式：确保文字清晰可见 */
  &.is-background {
    border-width: 2px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }
}

/* 清空颜色按钮 */
.ye-color-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0 0 0 4px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.06);

    #{$dark-selector} {
      background: rgba(255, 255, 255, 0.1);
    }

    .ye-color-clear-icon {
      color: #1677ff;

      #{$dark-selector} {
        color: #4fc3f7;
      }
    }
  }

  &:active {
    background: rgba(0, 0, 0, 0.1);

    #{$dark-selector} {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

.ye-color-clear-icon {
  font-size: 18px;
  line-height: 1;
  color: #8c8c8c;
  transition: color 0.2s;

  #{$dark-selector} {
    color: #999;
  }
}

/* ===== 颜色区域 ===== */
.ye-color-picker-section {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 区域标题 */
.ye-color-picker-section-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: #8c8c8c;

  #{$dark-selector} {
    color: #999;
  }
}

/* ===== 颜色网格 ===== */
.ye-color-picker-grid {
  display: grid;
  gap: 6px; /* 统一颜色块间距为 6px */
  justify-content: start;
  width: 100%;
  margin-bottom: 0;
}

/* 颜色块样式 */
.ye-color-picker__item {
  position: relative;
  padding: 0;
  cursor: pointer;
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 50%; /* 圆形 */
  transition: transform 0.2s;

  #{$dark-selector} {
    border-color: var(--ye-border);
  }

  /* 选中状态：蓝色边框和阴影，轻微放大 */
  &.is-selected {
    border-color: rgba(22, 119, 255, 0.8);
    box-shadow:
      0 0 0 2px rgba(22, 119, 255, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15);
    transform: scale(1.1);

    #{$dark-selector} {
      border-color: rgba(79, 195, 247, 0.8);
      box-shadow:
        0 0 0 2px rgba(79, 195, 247, 0.4),
        0 2px 8px rgba(0, 0, 0, 0.5);
    }
  }

  /* 悬停状态：放大效果，阴影 */
  &:hover:not(.is-selected) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transform: scale(1.2);

    #{$dark-selector} {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    }
  }
}

/* 预览方块按钮（可点击） */
.ye-color-picker-preview-btn {
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.06);

    #{$dark-selector} {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  &:active {
    background: rgba(0, 0, 0, 0.1);

    #{$dark-selector} {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

/* 高级颜色选择器 */
.ye-color-picker-advanced {
  padding-top: 12px;
  margin-top: 12px;
  border-top: var(--ye-border-width) solid var(--ye-border);

  #{$dark-selector} {
    border-top-color: var(--ye-border);
  }
}

.ye-color-picker-advanced-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ye-color-picker-advanced-title {
  font-size: 12px;
  font-weight: 500;
  color: #8c8c8c;

  #{$dark-selector} {
    color: #999;
  }
}

.ye-color-picker-advanced-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
  color: #8c8c8c;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  #{$dark-selector} {
    color: #999;
  }

  &:hover {
    color: #262626;
    background: rgba(0, 0, 0, 0.06);

    #{$dark-selector} {
      color: #f0f0f0;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.ye-color-picker-advanced-content {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ye-color-picker-color-input {
  width: 60px;
  height: 32px;
  padding: 0;
  cursor: pointer;
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 4px;

  #{$dark-selector} {
    background: #1f1f1f;
    border-color: var(--ye-border);
  }

  &:hover {
    border-color: #1677ff;

    #{$dark-selector} {
      border-color: #4fc3f7;
    }
  }

  &:focus {
    outline: none;
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);

    #{$dark-selector} {
      border-color: #4fc3f7;
      box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
    }
  }
}

.ye-color-picker-color-text {
  flex: 1;
  height: 32px;
  padding: 4px 11px;
  font-size: 14px;
  color: #262626;
  background: #fff;
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 4px;
  transition: all 0.2s;

  #{$dark-selector} {
    color: #f0f0f0;
    background: #1f1f1f;
    border-color: var(--ye-border);
  }

  &:hover {
    border-color: #1677ff;

    #{$dark-selector} {
      border-color: #4fc3f7;
    }
  }

  &:focus {
    outline: none;
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);

    #{$dark-selector} {
      border-color: #4fc3f7;
      box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
    }
  }

  &::placeholder {
    color: #bfbfbf;

    #{$dark-selector} {
      color: #666;
    }
  }
}

/* 覆盖 Ant Design Popover 的默认内边距 */
:deep(.ye-color-picker-popover) {
  .ant-popover-inner {
    padding: 0; /* 移除 Popover 默认内边距，使用组件内部 padding */
  }
}
</style>
