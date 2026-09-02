<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :options="bubbleBindings.options"
    :append-to="bubbleBindings.appendTo"
    :should-show="shouldShow"
    class="image-bubble-menu"
    :class="appearanceClass"
    :data-color-mode="resolvedColorMode"
  >
    <div class="image-menu-content">
      <!-- 对齐方式 -->
      <div class="image-menu-group">
        <button
          v-for="alignOption in alignOptions"
          :key="alignOption.value"
          class="image-menu-btn"
          :class="{ active: currentAlign === alignOption.value }"
          :title="t(alignOption.titleKey)"
          @click="setAlign(alignOption.value)"
        >
          <component :is="alignOption.icon" />
        </button>
      </div>

      <!-- 预览 -->
      <div class="image-menu-group">
        <button class="image-menu-btn" :title="t('editor.mediaPreview')" @click="previewImage">
          <EyeOutlined />
        </button>
      </div>

      <!-- 删除 -->
      <div class="image-menu-group">
        <button
          class="image-menu-btn image-menu-btn--danger"
          :title="t('editor.imageDelete')"
          @click="deleteImage"
        >
          <DeleteOutlined />
        </button>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <a-modal
      v-model:open="previewVisible"
      :footer="null"
      :width="800"
      centered
      :get-container="getOverlayContainer"
      wrap-class-name="yaniv-editor-modal"
      @cancel="previewVisible = false"
    >
      <img
        v-if="currentImageSrc"
        :src="currentImageSrc"
        :alt="t('editor.mediaPreview')"
        style="width: 100%; height: auto"
      />
    </a-modal>
  </bubble-menu>
</template>

<script setup lang="ts">
/**
 * ImageToolbar - 图片工具栏组件
 * @description 提供图片对齐、预览、删除等功能的气泡菜单
 */
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { computed, ref } from "vue";

import { getAppearanceClassName, useInjectEditorAppearance } from "@/appearance";
import { shouldShowImageBubbleMenu } from "@/composables/bubbleMenuShouldShow";
import { useOverlayBubbleMenu, useOverlayMountTarget } from "@/composables/useOverlayMount";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Modal as AModal } from "@/shared/antd";
import { createCommandRunner, type EditorChain } from "@/utils/editorCommands";

import { applyImageAlign, findSelectedImage } from "./imageToolbarActions";

// ===== Props =====
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const t = useEditorT();
const editor = useYanivEditor();
const runCommand = createCommandRunner(editor);

const appearanceCtx = useInjectEditorAppearance();
const appearanceClass = computed(() =>
  getAppearanceClassName(appearanceCtx?.appearance.value ?? "default"),
);
const resolvedColorMode = computed(() => appearanceCtx?.resolvedMode.value ?? "light");

// ===== 状态 =====
const previewVisible = ref(false);
const currentImageSrc = ref("");
const currentAlign = ref<"left" | "center" | "right" | null>(null);

// ===== 对齐选项配置 =====
const alignOptions = [
  { value: "left" as const, icon: AlignLeftOutlined, titleKey: "editor.alignLeft" },
  { value: "center" as const, icon: AlignCenterOutlined, titleKey: "editor.alignCenter" },
  { value: "right" as const, icon: AlignRightOutlined, titleKey: "editor.alignRight" },
];

// ===== 工具函数 =====

/**
 * 获取图片的对齐方式
 */
function getImageAlign() {
  const { node, pos } = findSelectedImage(editor.value);
  if (!node || pos === null) return null;

  // 优先检查图片节点本身的对齐属性
  const nodeAlign = node.attrs.align;
  if (nodeAlign === "left" || nodeAlign === "center" || nodeAlign === "right") {
    return nodeAlign;
  }

  // 检查父节点的对齐方式
  const e = editor.value;
  if (!e) return null;
  const $pos = e.state.doc.resolve(pos);
  const parent = $pos.parent;
  const parentAlign = parent?.attrs.textAlign || parent?.attrs.align;
  if (parentAlign === "left" || parentAlign === "center" || parentAlign === "right") {
    return parentAlign;
  }

  return null;
}

// ===== 事件处理 =====

/**
 * 检查是否应该显示工具栏
 */
const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) => {
  if (!shouldShowImageBubbleMenu(bubbleProps, props.disabled)) return false;

  const { node } = findSelectedImage(editor.value);
  if (node?.type.name === "image") {
    currentImageSrc.value = node.attrs.src || "";
    currentAlign.value = getImageAlign();
  }

  return true;
};

const bubbleBindings = useOverlayBubbleMenu({
  placement: "top",
  offset: 16,
});
const getOverlayContainer = useOverlayMountTarget();

/**
 * 设置图片对齐方式
 */
function setAlign(align: "left" | "center" | "right") {
  const e = editor.value;
  if (!e) return;

  const { node, pos } = findSelectedImage(editor.value);
  if (!node || pos === null) return;

  applyImageAlign(e, pos, align);
  currentAlign.value = align;
}

/**
 * 预览图片
 */
function previewImage() {
  const { node } = findSelectedImage(editor.value);
  if (node?.type.name === "image") {
    currentImageSrc.value = node.attrs.src || "";
    previewVisible.value = true;
  }
}

/**
 * 删除图片
 */
function deleteImage() {
  runCommand((chain: EditorChain) => chain.deleteSelection())();
}
</script>

<style scoped>
.image-menu-content {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  [data-color-mode="dark"] & {
    background: #1f1f1f;
  }
}

.image-menu-group {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 4px;
  border-right: var(--ye-border-width) solid var(--ye-border);
}

.image-menu-group:last-child {
  border-right: none;
}

.image-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #333;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  [data-color-mode="dark"] & {
    color: #f0f0f0;
  }
}

.image-menu-btn:hover:not(:disabled) {
  background: #f5f5f5;

  [data-color-mode="dark"] & {
    background: #303030;
  }
}

.image-menu-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.image-menu-btn.active {
  color: #1677ff;
  background: #e6f4ff;

  [data-color-mode="dark"] & {
    color: #4fc3f7;
    background: #15395b;
  }
}

.image-menu-btn--danger {
  color: #ff4d4f;

  [data-color-mode="dark"] & {
    color: #ff7875;
  }
}

.image-menu-btn--danger:hover {
  background: #fff1f0;

  [data-color-mode="dark"] & {
    background: #3a1a1a;
  }
}
</style>
