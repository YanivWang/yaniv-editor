<template>
  <div class="tiptap-pro-editor word-mode" :class="{ 'is-preview-mode': isPreviewMode }">
    <!-- 工具栏（预览模式下隐藏） -->
    <ToolbarNav
      v-if="editorInstance && !isPreviewMode"
      :editor="editorInstance"
      :config="toolbarConfig"
      :enabled="shouldShowHeaderNav"
      class="word-toolbar"
    >
    </ToolbarNav>

    <!-- 功能模块：链接悬浮框（预览模式下禁用） -->
    <LinkBubbleMenu
      v-if="editorInstance && !isPreviewMode && (props.features?.linkBubbleMenu ?? false)"
      :editor="editorInstance"
      :readonly="readonly"
      :enabled="props.features?.linkBubbleMenu ?? false"
    />

    <!-- 功能模块：表格工具栏（预览模式下禁用） -->
    <TableToolbar
      v-if="editorInstance && !isPreviewMode"
      :editor="editorInstance"
      :readonly="readonly"
      :show-mode="props.tableMenuShowMode ?? 2"
      :enabled="props.features?.tableToolbar ?? false"
    />

    <!-- 功能模块：图片工具栏（预览模式下禁用） -->
    <ImageToolbar
      v-if="editorInstance && !isPreviewMode && (props.features?.image ?? false)"
      :editor="editorInstance"
      :readonly="readonly"
      :enabled="props.features?.image ?? false"
    />

    <!-- 功能模块：视频工具栏（预览模式下禁用） -->
    <VideoToolbar
      v-if="editorInstance && !isPreviewMode && (props.features?.image ?? false)"
      :editor="editorInstance"
      :readonly="readonly"
      :enabled="props.features?.image ?? false"
    />

    <!-- 功能模块：悬浮菜单（预览模式下禁用） -->
    <FloatingMenu
      v-if="editorInstance && !isPreviewMode && (props.features?.floatingMenu ?? false)"
      :editor="editorInstance"
      :readonly="readonly"
      :enabled="props.features?.floatingMenu ?? false"
    />

    <!-- 功能模块：斜杠命令菜单（预览模式下禁用） -->
    <SlashCommandMenu
      v-if="editorInstance && !isPreviewMode && (props.features?.slashCommand ?? false)"
      ref="slashCommandMenuRef"
      :editor="editorInstance"
    />

    <!-- Word 文档区域容器 -->
    <div ref="containerRef" class="word-document-container">
      <div class="document-pages" :style="{ transform: `scale(${zoomLevel / 100})` }">
        <div class="continuous-pages">
          <EditorContent
            v-if="editorInstance"
            :editor="editorInstance"
            class="word-content-multi"
          />
          <div v-else class="editor-fallback">{{ editorError || "正在初始化编辑器..." }}</div>
        </div>
      </div>
    </div>

    <!-- 底部导航（预览模式下隐藏） -->
    <FooterNav
      v-if="editorInstance && !isPreviewMode && shouldShowFooterNav"
      v-model:zoom-level="zoomLevel"
      :total-pages="totalPages"
      :editor="editorInstance"
      :show-char-count="true"
      :show-shortcut-hints="showStatusShortcutHints"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * TiptapProEditor - 基础版富文本编辑器
 * @description 支持基础版功能的 Tiptap 编辑器
 */
import { Editor, EditorContent } from "@tiptap/vue-3";
import { Modal } from "ant-design-vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

import { getExtensionsByVersion } from "@/extensions/coreExtensions";
// @vben/locales removed - using built-in i18n
import { t } from "@/locales";
import { DragHandleExtension } from "@/tools/drag-handle";
import { FloatingMenu } from "@/tools/floating-menu";
import { FooterNav } from "@/tools/footer-nav";
import { ToolbarNav } from "@/tools/header-nav";
import { ImageToolbar } from "@/tools/image-toolbar";
import { LinkBubbleMenu } from "@/tools/link-bubble";
import { SlashCommandMenu, SlashCommandExtension } from "@/tools/slash-command";
import type { SlashCommandState } from "@/tools/slash-command";
import { TableToolbar } from "@/tools/table-toolbar";
import { VideoToolbar } from "@/tools/video-toolbar";
import { validateTiptapProEditorProps } from "@/utils/validateEditorProps";

import { useEditorFeatures } from "./useEditorFeatures";
import { useEditorI18n } from "./useEditorI18n";
import { useEditorPagination } from "./useEditorPagination";

import type { TiptapProEditorProps } from "./editorTypes";

// 样式（variables.css 需最先加载以定义 CSS 变量，base.css 需在其他样式之前加载）
import "@/styles/variables.css";
import "@/styles/base.css";
import "@/styles/word-mode.css";
import "@/styles/toolbar.css";
import "@/styles/image-toolbar.css";
import "@/styles/floating-menu-toolbar.css";
import "@/styles/image-resize.css";
import "@/styles/slash-command.css";
import "@/styles/drag-handle.css";

const props = withDefaults(defineProps<TiptapProEditorProps>(), {
  zoomBarPlacement: "bottom",
  readonly: false,
  previewMode: false,
  initialContent: "<p>开始编辑你的文档...</p>",
  version: "basic",
});

// ===== 预览模式 =====
const isPreviewMode = computed(() => props.previewMode);

const emit = defineEmits<{
  update: [content: any];
}>();

// ===== 基础状态 =====
const editor = shallowRef<Editor | null>(null);
const editorError = ref<string | null>(null);
const containerRef = ref<HTMLElement | null>(null);

type SlashCommandMenuInstance = {
  activate: (state: SlashCommandState) => void;
  hide: () => void;
  updateQuery: (query: string) => void;
};

const slashCommandMenuRef = ref<SlashCommandMenuInstance | null>(null);
const { totalPages, zoomLevel, calculatePages, initPageCssVariables } =
  useEditorPagination(containerRef);
const isFirstInit = ref(true);
const isInitializing = ref(false);

const editorInstance = computed(() => editor.value as Editor);

const {
  shouldShowHeaderNav,
  shouldShowFooterNav,
  resolvedExtensionGates,
  toolbarConfig,
  showStatusShortcutHints,
} = useEditorFeatures(props);

// ===== 国际化 =====
useEditorI18n(props);

// ===== 编辑器内容管理 =====
const getEditorContent = () => {
  try {
    return editor.value?.getJSON() ?? null;
  } catch {
    return null;
  }
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const normalizeInitialContent = (content: any): any => {
  if (!content) return EMPTY_DOC;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return { type: "doc", content };
  if (typeof content === "object") {
    if (content.type === "doc") return content;
    if (Array.isArray(content.content)) return { type: "doc", content: content.content };
    return { type: "doc", content: [content] };
  }
  return EMPTY_DOC;
};

const getInitialContent = (): any => {
  // 非首次初始化时保留当前内容
  if (!isFirstInit.value && editor.value) {
    const currentContent = getEditorContent();
    if (currentContent) return currentContent;
  }
  return normalizeInitialContent(props.initialContent);
};

// ===== 编辑器初始化 =====
const initEditor = async () => {
  if (isInitializing.value) return;

  try {
    isInitializing.value = true;

    const initialContentToUse = getInitialContent();

    if (isFirstInit.value) {
      isFirstInit.value = false;
    }

    // 获取扩展配置
    const enableImageResize = props.versionConfig?.features?.advanced !== false;
    const extensions = getExtensionsByVersion(props.version, {
      enableImageResize,
      features: resolvedExtensionGates.value,
      officePaste: {
        onPasteFromOfficeWithImages: () =>
          Modal.info({
            title: t("editor.officePasteImageTitle"),
            content: t("editor.officePasteImageBody"),
          }),
      },
    });

    // 添加块拖拽手柄扩展（只负责拖动排序，不提供点击菜单）
    if (!props.readonly && !isPreviewMode.value && props.features?.dragHandle !== false) {
      extensions.push(DragHandleExtension);
    }

    // 添加斜杠命令扩展
    if (props.features?.slashCommand) {
      extensions.push(
        SlashCommandExtension.configure({
          onActivate: (state: SlashCommandState) => slashCommandMenuRef.value?.activate(state),
          onDeactivate: () => slashCommandMenuRef.value?.hide(),
          onQueryChange: (query: string) => slashCommandMenuRef.value?.updateQuery(query),
        }),
      );
    }

    // 销毁旧编辑器
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
    }

    await nextTick();

    // 创建编辑器（预览模式下也设为不可编辑）
    editor.value = new Editor({
      editable: !props.readonly && !isPreviewMode.value,
      extensions,
      content: initialContentToUse,
      editorProps: {
        attributes: { class: "word-editor-content" },
      },
      onUpdate: ({ editor }) => {
        calculatePages();
        emit("update", editor.getJSON());
      },
    });

    await nextTick();

    initPageCssVariables();

    calculatePages();
  } catch (error) {
    console.error("[TiptapProEditor] Editor initialization failed:", error);
    editorError.value = "编辑器初始化失败";
  } finally {
    isInitializing.value = false;
  }
};

// ===== 清理 =====
const destroyEditor = async () => {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
};

// ===== 生命周期 =====
onMounted(async () => {
  validateTiptapProEditorProps(props);
  await initEditor();
});

onBeforeUnmount(async () => {
  await destroyEditor();
});

// ===== 属性监听 =====
const watchAndReinit = (
  getter: () => any,
  shouldReinit: (newValue: any, oldValue: any) => boolean = (newVal, oldVal) => newVal !== oldVal,
) => {
  watch(getter, async (newValue, oldValue) => {
    if (oldValue === undefined || !editor.value || isInitializing.value) return;
    if (shouldReinit(newValue, oldValue)) {
      await nextTick();
      await initEditor();
    }
  });
};

watchAndReinit(
  () => props.features?.slashCommand,
  (newVal, oldVal) => (newVal ?? false) !== (oldVal ?? false),
);

// 功能门控变化时重建编辑器，保持扩展与 UI 一致
watch(resolvedExtensionGates, async (next, prev) => {
  if (prev === undefined || !editor.value || isInitializing.value) return;
  if (JSON.stringify(next) === JSON.stringify(prev)) return;
  await nextTick();
  await initEditor();
});

// ===== 暴露方法 =====
defineExpose({
  getEditor: () => editor.value,
  getJSON: () => editor.value?.getJSON() || null,
  getHTML: () => editor.value?.getHTML() || "",
  getText: () => editor.value?.getText() || "",
});
</script>
