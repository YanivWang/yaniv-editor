<template>
  <ToolbarGroup>
    <ToolbarButton
      :icon="LinkOutlined"
      :title="t('editor.link')"
      :active="isActive('link')"
      @click="handleClick"
    />
  </ToolbarGroup>

  <!-- 链接输入模态框 -->
  <a-modal
    v-model:open="linkModalOpen"
    :title="t('editor.insertLink')"
    width="400px"
    :get-container="getOverlayContainer"
    wrap-class-name="yaniv-editor-modal"
    @ok="applyLink"
  >
    <a-input
      v-model:value="linkUrl"
      :placeholder="t('editor.linkPlaceholder')"
      @keyup.enter="applyLink"
    />
  </a-modal>
</template>

<script setup lang="ts">
/**
 * LinkButton - 链接按钮
 * @description 可复用的链接按钮组件，包含链接插入/编辑功能
 */
import { LinkOutlined } from "@ant-design/icons-vue";
import { ref } from "vue";

import { ToolbarButton, ToolbarGroup } from "@/components/base";
import { useOverlayFeedback } from "@/composables/useOverlayFeedback";
import { useOverlayMountTarget } from "@/composables/useOverlayMount";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Input as AInput, Modal as AModal } from "@/shared/antd";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";
import { normalizeSafeUrl } from "@/utils/safeUrl";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();
const getOverlayContainer = useOverlayMountTarget();
const feedback = useOverlayFeedback();

// ===== Props =====
interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

// ===== 响应式状态 =====
const linkModalOpen = ref(false);
const linkUrl = ref("");

// ===== 工具函数 =====
const runCommand = createCommandRunner(editor);
const { isActive } = createStateCheckers(editor);

// ===== 方法 =====
/**
 * 处理链接按钮点击
 */
function handleClick() {
  const e = editor.value;
  if (!e) return;

  // 如果已经是链接，获取当前链接地址
  if (e.isActive("link")) {
    linkUrl.value = e.getAttributes("link")?.href ?? "";
  } else {
    linkUrl.value = "";
  }

  linkModalOpen.value = true;
}

/**
 * 构建链接属性
 */
function buildLinkAttrs(href: string) {
  return {
    href,
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

/**
 * 应用链接
 */
function applyLink() {
  const rawUrl = linkUrl.value.trim();
  const e = editor.value;
  if (!e) return;

  // 如果 URL 为空，移除链接
  if (!rawUrl) {
    runCommand((chain) => chain.unsetLink())();
    linkModalOpen.value = false;
    linkUrl.value = "";
    return;
  }

  const safeUrl = normalizeSafeUrl(rawUrl);
  if (!safeUrl) {
    feedback.toast(t("editor.enterValidLink"), "warning");
    return;
  }

  const hasSelection = !e.state.selection.empty;
  const chain = e.chain().focus();

  if (hasSelection) {
    chain.extendMarkRange("link").setLink(buildLinkAttrs(safeUrl)).run();
  } else {
    chain
      .insertContent([
        {
          type: "text",
          text: safeUrl,
          marks: [{ type: "link", attrs: buildLinkAttrs(safeUrl) }],
        },
      ])
      .run();
  }

  linkModalOpen.value = false;
  linkUrl.value = "";
}
</script>
