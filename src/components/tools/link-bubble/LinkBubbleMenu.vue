<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top', offset: [0, 8], zIndex: 1002 }"
    :should-show="shouldShow"
    class="link-bubble-menu"
  >
    <div class="link-bubble-menu-content">
      <!-- 链接URL显示 -->
      <div class="link-url-display">
        <span class="link-url-text" :title="currentLinkUrl">{{ currentLinkUrl }}</span>
      </div>

      <!-- 操作按钮组 -->
      <div class="link-actions">
        <!-- 分隔线 -->
        <div class="link-divider"></div>

        <!-- 编辑链接按钮 -->
        <button class="link-action-btn" :title="t('editor.editLink')" @click="editLink">
          <EditOutlined />
        </button>

        <!-- 分隔线 -->
        <div class="link-divider"></div>

        <!-- 打开链接按钮 -->
        <button class="link-action-btn" :title="t('editor.openLink')" @click="openLink">
          <LinkOutlined />
        </button>

        <!-- 分隔线 -->
        <div class="link-divider"></div>

        <!-- 删除链接按钮 -->
        <button
          class="link-action-btn link-action-btn--danger"
          :title="t('editor.removeLink')"
          @click="removeLink"
        >
          <DeleteOutlined />
        </button>
      </div>
    </div>

    <!-- 编辑链接模态框 -->
    <a-modal
      v-model:open="linkModalOpen"
      :title="t('editor.editLink')"
      width="400px"
      @ok="applyLink"
    >
      <a-input
        v-model:value="linkUrl"
        :placeholder="t('editor.linkPlaceholder')"
        @keyup.enter="applyLink"
      />
    </a-modal>
  </bubble-menu>
</template>

<script setup lang="ts">
/**
 * LinkBubbleMenu - 链接悬浮框组件
 * @description 选中链接时显示的悬浮框，提供链接编辑、打开、删除等功能
 * @description 此组件位于 components/tools/link-bubble，由 Full Editor preset layout 决定是否启用
 */
import { EditOutlined, LinkOutlined, DeleteOutlined } from "@ant-design/icons-vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { nextTick, ref, watch } from "vue";

import { shouldShowLinkBubbleMenu } from "@/composables/bubbleMenuShouldShow";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { createCommandRunner } from "@/utils/editorCommands";
import { normalizeSafeUrl } from "@/utils/safeUrl";

const t = useEditorT();

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const editor = useYanivEditor();
const runCommand = createCommandRunner(editor);

// 响应式状态
const currentLinkUrl = ref("");
const linkModalOpen = ref(false);
const linkUrl = ref("");

/**
 * 更新当前链接URL
 */
function updateCurrentLinkUrl() {
  const e = editor.value;
  if (!e) {
    currentLinkUrl.value = "";
    return;
  }

  if (e.isActive("link")) {
    const attrs = e.getAttributes("link");
    currentLinkUrl.value = attrs.href || "";
  } else {
    currentLinkUrl.value = "";
  }
}

/**
 * 检查是否应该显示链接悬浮框
 * @description 只在选中链接文本时显示（部分或全部），选中非链接文本时不显示
 */
const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) =>
  shouldShowLinkBubbleMenu(bubbleProps, props.disabled, (href) => {
    currentLinkUrl.value = href;
  });

// 监听编辑器选择变化，更新链接URL
watch(
  () => editor.value?.state.selection,
  () => {
    if (editor.value?.isActive("link")) {
      updateCurrentLinkUrl();
    }
  },
  { deep: true },
);

// 监听编辑器状态更新，同步链接URL
watch(
  () => editor.value?.state,
  () => {
    updateCurrentLinkUrl();
  },
  { deep: true, immediate: true },
);

/**
 * 编辑链接
 */
function editLink() {
  const e = editor.value;
  if (!e) return;

  if (e.isActive("link")) {
    linkUrl.value = e.getAttributes("link").href || "";
  } else {
    linkUrl.value = "";
  }

  linkModalOpen.value = true;
}

/**
 * 应用链接编辑
 */
function applyLink() {
  const e = editor.value;
  if (!e) return;

  const finalUrl = linkUrl.value.trim();

  if (finalUrl) {
    const urlToSet = normalizeSafeUrl(finalUrl);
    if (!urlToSet) return;

    // 更新链接 - 直接使用编辑器实例确保状态同步
    if (e) {
      const hasSelection = !e.state.selection.empty;
      const chain = e.chain().focus();

      if (hasSelection) {
        // 如果有选中文本，扩展标记范围并设置链接
        const success = chain
          .extendMarkRange("link")
          .setLink({ href: urlToSet, target: "_blank" })
          .run();
        if (success) {
          // 立即更新显示的链接URL
          currentLinkUrl.value = urlToSet;
          // 等待状态同步后再次确认
          nextTick(() => {
            updateCurrentLinkUrl();
          });
        }
      } else {
        // 如果没有选中文本，在当前光标位置设置链接
        const success = chain.setLink({ href: urlToSet, target: "_blank" }).run();
        if (success) {
          currentLinkUrl.value = urlToSet;
          nextTick(() => {
            updateCurrentLinkUrl();
          });
        }
      }
    }
  } else {
    // 如果URL为空，移除链接
    runCommand((chain: any) => chain.unsetLink())();
    currentLinkUrl.value = "";
  }

  // 关闭模态框并清空输入
  linkModalOpen.value = false;
  linkUrl.value = "";
}

/**
 * 打开链接
 */
function openLink() {
  const e = editor.value;
  if (!e) return;

  if (e.isActive("link")) {
    const attrs = e.getAttributes("link");
    const href = attrs.href || "";
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }
}

/**
 * 删除链接
 */
function removeLink() {
  runCommand((chain: any) => chain.unsetLink())();
}
</script>

<style scoped>
/* 链接悬浮框容器 */
.link-bubble-menu {
  z-index: 1002; /* 比图片工具栏稍高，确保链接悬浮框显示在上层 */
}

.link-bubble-menu-content {
  display: flex;
  gap: 0;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  [data-color-mode="dark"] & {
    background: #1f1f1f;
    border-color: #434343;
  }
}

/* 链接URL显示区域 */
.link-url-display {
  flex: 1;
  min-width: 0;
  padding-right: 12px;
}

.link-url-text {
  display: block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
  color: #262626;
  white-space: nowrap;

  [data-color-mode="dark"] & {
    color: #f0f0f0;
  }
}

/* 操作按钮组 */
.link-actions {
  display: flex;
  gap: 0;
  align-items: center;
}

/* 分隔线 */
.link-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: #e8e8e8;

  [data-color-mode="dark"] & {
    background: #434343;
  }
}

/* 操作按钮 */
.link-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #262626;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  [data-color-mode="dark"] & {
    color: #f0f0f0;
  }
}

.link-action-btn:hover:not(:disabled) {
  background: #f5f5f5;

  [data-color-mode="dark"] & {
    background: #303030;
  }
}

.link-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 危险按钮样式（删除） */
.link-action-btn--danger {
  color: #ff4d4f;

  [data-color-mode="dark"] & {
    color: #ff7875;
  }
}

.link-action-btn--danger:hover {
  color: #ff4d4f;
  background: #fff1f0;

  [data-color-mode="dark"] & {
    color: #ff7875;
    background: #3a1a1a;
  }
}

/* 响应式设计 */
@media (width <= 768px) {
  .link-bubble-menu-content {
    padding: 6px 10px;
  }

  .link-url-text {
    max-width: 200px;
    font-size: 13px;
  }

  .link-action-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
