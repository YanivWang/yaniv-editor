<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :options="bubbleBindings.options"
    :append-to="bubbleBindings.appendTo"
    :should-show="shouldShow"
    class="link-bubble-menu"
  >
    <div
      class="link-bubble-menu-content"
      :class="appearanceClass"
      :data-color-mode="resolvedColorMode"
    >
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
import { nextTick, ref, watch, computed } from "vue";

import { getAppearanceClassName, useInjectEditorAppearance } from "@/appearance";
import { applyLinkToEditor } from "@/components/editor/link/linkActions";
import { shouldShowLinkBubbleMenu } from "@/composables/bubbleMenuShouldShow";
import { useOverlayFeedback } from "@/composables/useOverlayFeedback";
import { useOverlayBubbleMenu, useOverlayMountTarget } from "@/composables/useOverlayMount";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Input as AInput, Modal as AModal } from "@/shared/antd";
import { createCommandRunner } from "@/utils/editorCommands";
import { normalizeSafeUrl } from "@/utils/safeUrl";

const t = useEditorT();
const feedback = useOverlayFeedback();

const appearanceCtx = useInjectEditorAppearance();
const appearanceClass = computed(() =>
  getAppearanceClassName(appearanceCtx?.appearance.value ?? "default"),
);
const resolvedColorMode = computed(() => appearanceCtx?.resolvedMode.value ?? "light");

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

const bubbleBindings = useOverlayBubbleMenu({
  placement: "top",
  offset: 8,
});
const getOverlayContainer = useOverlayMountTarget();

/**
 * 链接 URL 的**实时来源是 `shouldShow`**：BubbleMenu 每次重新判断可见性都会调用它，
 * 命中链接时经 `onLinkFound` 回填 `currentLinkUrl`。
 *
 * 这里只在编辑器实例被换掉（session 重建）时复位一次。
 * 不要改成 watch `editor.value?.state` / `.state.selection`：`editor` 是 shallowRef，
 * ProseMirror 的 state 不是响应式对象，对它取值的 getter 只会在**实例本身**变化时重跑
 * ——选区与文档变化根本不触发；而 `deep: true` 还会在每次重跑时把整个 state 对象图
 * （文档全树、schema、各插件状态）深度遍历一遍。
 */
watch(editor, updateCurrentLinkUrl, { immediate: true });

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
 * 应用链接编辑。
 *
 * 分流交给 `applyLinkToEditor`——它是 `LinkButton` 用的同一份实现。此前这里自己写了
 * 一份「按 `selection.empty` 二选一」的逻辑，正是 `linkActions` 抽出来之前的形状：
 * 同一个决定有两份实现，修好一处不会惠及另一处。
 * （这里那半实际不可达：bubble menu 只在选区非空时显示。收敛掉是为了不再有第二份。）
 */
function applyLink() {
  const e = editor.value;
  if (!e) return;

  const finalUrl = linkUrl.value.trim();

  if (!finalUrl) {
    // 清空输入 = 移除链接
    runCommand((chain: any) => chain.unsetLink())();
    currentLinkUrl.value = "";
    closeLinkModal();
    return;
  }

  const safeUrl = normalizeSafeUrl(finalUrl);
  if (!safeUrl) {
    // 不提示就是静默失败：弹窗还开着、链接没变，用户不知道自己输错了什么
    feedback.toast(t("editor.enterValidLink"), "warning");
    return;
  }

  applyLinkToEditor(e, safeUrl);
  currentLinkUrl.value = safeUrl;
  // 命令走的是 chain，属性要等这一拍事务落地后再读
  nextTick(updateCurrentLinkUrl);
  closeLinkModal();
}

function closeLinkModal() {
  linkModalOpen.value = false;
  linkUrl.value = "";
}

/**
 * 打开链接
 */
function openLink() {
  const e = editor.value;
  if (!e) return;

  if (!e.isActive("link")) return;

  // 必须再过一次白名单：attrs.href 可能来自宿主直接注入的 JSON，
  // 而 window.open("javascript:...") 会执行脚本。
  const safeHref = normalizeSafeUrl(e.getAttributes("link").href || "");
  if (!safeHref) return;

  window.open(safeHref, "_blank", "noopener,noreferrer");
}

/**
 * 删除链接
 */
function removeLink() {
  runCommand((chain: any) => chain.unsetLink())();
}
</script>

<style scoped>
.link-bubble-menu-content:not(.appearance-notion) {
  display: flex;
  gap: 0;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border: var(--ye-border-width) solid var(--ye-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  [data-color-mode="dark"] & {
    background: #1f1f1f;
  }
}

.link-bubble-menu-content.appearance-notion {
  display: flex;
  gap: 0;
  align-items: center;
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
  white-space: nowrap;
}

.link-bubble-menu-content:not(.appearance-notion) .link-url-text {
  color: #262626;

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
.link-bubble-menu-content:not(.appearance-notion) .link-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: #e8e8e8;

  [data-color-mode="dark"] & {
    background: #434343;
  }
}

.link-bubble-menu-content.appearance-notion .link-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
}

/* 操作按钮 */
.link-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.link-bubble-menu-content:not(.appearance-notion) .link-action-btn {
  color: #262626;

  [data-color-mode="dark"] & {
    color: #f0f0f0;
  }
}

.link-bubble-menu-content:not(.appearance-notion) .link-action-btn:hover:not(:disabled) {
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
.link-bubble-menu-content:not(.appearance-notion) .link-action-btn--danger {
  color: #ff4d4f;

  [data-color-mode="dark"] & {
    color: #ff7875;
  }
}

.link-bubble-menu-content:not(.appearance-notion) .link-action-btn--danger:hover:not(:disabled) {
  background: #fff1f0;

  [data-color-mode="dark"] & {
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
