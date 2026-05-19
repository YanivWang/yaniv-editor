<template>
  <div
    ref="rootRef"
    class="yaniv-editor document-layout"
    :class="{ 'is-preview-mode': isPreviewMode }"
  >
    <!-- 工具栏（预览模式下隐藏） -->
    <ToolbarNav
      v-if="editor && !isPreviewMode && shouldShowHeaderNav"
      :editor="editor"
      :config="toolbarConfig"
      class="document-toolbar"
    >
    </ToolbarNav>

    <!-- 功能模块：链接悬浮框（预览模式下禁用） -->
    <LinkBubbleMenu
      v-if="editor && !isPreviewMode && uiFlags.linkBubbleMenu"
      :editor="editor"
      :readonly="readonly"
    />

    <!-- 功能模块：表格工具栏（预览模式下禁用） -->
    <TableToolbar
      v-if="editor && !isPreviewMode && uiFlags.tableToolbar"
      :editor="editor"
      :readonly="readonly"
      :show-mode="props.tableMenuShowMode ?? 2"
    />

    <!-- 功能模块：图片工具栏（预览模式下禁用） -->
    <ImageToolbar
      v-if="editor && !isPreviewMode && uiFlags.image"
      :editor="editor"
      :readonly="readonly"
    />

    <!-- 功能模块：视频工具栏（预览模式下禁用） -->
    <VideoToolbar
      v-if="editor && !isPreviewMode && uiFlags.image"
      :editor="editor"
      :readonly="readonly"
    />

    <!-- 功能模块：悬浮菜单（预览模式下禁用） -->
    <FloatingMenu
      v-if="editor && !isPreviewMode && uiFlags.floatingMenu"
      :editor="editor"
      :readonly="readonly"
    />

    <!-- 功能模块：Notion 风格块选择菜单（/ 转换当前块，+ 在下方插入新块） -->
    <BlockPickerMenu
      v-if="editor && !isPreviewMode && showBlockPickerMenu"
      ref="blockPickerMenuRef"
      :editor="editor"
    />

    <!-- Word 文档区域容器 -->
    <div class="document-body">
      <OutlinePanel v-if="editor && !isPreviewMode && showOutlinePanel" :editor="editor" />
      <div ref="containerRef" class="document-container">
        <CodeBlockLanguageBadge
          v-if="editor && !isPreviewMode && toolbarConfig.codeBlock"
          :editor="editor"
          :container="containerRef"
        />
        <div class="document-pages" :style="{ transform: `scale(${zoomLevel / 100})` }">
          <div class="continuous-pages">
            <EditorContent v-if="editor" :editor="editor" class="document-content" />
            <div v-else class="editor-status">{{ editorError || "正在初始化编辑器..." }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航（预览模式下隐藏） -->
    <FooterNav
      v-if="editor && !isPreviewMode && shouldShowFooterNav"
      v-model:zoom-level="zoomLevel"
      :total-pages="totalPages"
      :editor="editor"
      :show-char-count="true"
      :show-shortcut-hints="showStatusShortcutHints"
      :zoom-bar-placement="props.zoomBarPlacement"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * YanivEditor - 富文本编辑器
 * @description 由 features 门控扩展注册与 UI 显隐
 */
import { Editor, EditorContent } from "@tiptap/vue-3";
import { Modal } from "ant-design-vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRef, watch } from "vue";

import { CodeBlockLanguageBadge } from "@/components/editor/code-block";
import { OutlinePanel, provideOutlinePanel } from "@/components/editor/outline";
import { BlockPickerMenu } from "@/components/tools/block-menu";
import { DragHandleExtension } from "@/components/tools/drag-handle";
import { FloatingMenu } from "@/components/tools/floating-menu";
import { FooterNav } from "@/components/tools/footer-nav";
import { ToolbarNav } from "@/components/tools/header-nav";
import { ImageToolbar } from "@/components/tools/image-toolbar";
import { LinkBubbleMenu } from "@/components/tools/link-bubble";
import { SlashCommandExtension } from "@/components/tools/slash-command";
import type { SlashCommandState } from "@/components/tools/slash-command";
import { TableToolbar } from "@/components/tools/table-toolbar";
import { VideoToolbar } from "@/components/tools/video-toolbar";
import { buildEditorExtensions } from "@/extensions/coreExtensions";
import { t } from "@/locales";
import { useEditorTheme } from "@/themes";

import { useEditorFeatures } from "./useEditorFeatures";
import { useEditorI18n } from "./useEditorI18n";
import { useEditorPagination } from "./useEditorPagination";

import type { YanivEditorProps } from "./editorTypes";
import type { JSONContent } from "@tiptap/core";

// 样式（variables.css 需最先加载以定义 CSS 变量，base.css 需在其他样式之前加载）
import "@/styles/variables.css";
import "@/styles/base.css";
import "@/styles/document-layout.css";
import "@/styles/task-list.css";
import "@/styles/toolbar.css";
import "@/styles/toolbar-dropdown.css";
import "@/styles/image-toolbar.css";
import "@/styles/floating-menu-toolbar.css";
import "@/styles/block-picker.css";
import "@/styles/drag-handle.css";
import "@/styles/placeholder.css";
import "@/styles/code-block.css";
import "@/styles/outline.css";

const props = withDefaults(defineProps<YanivEditorProps>(), {
  zoomBarPlacement: "bottom",
  readonly: false,
  previewMode: false,
  initialContent: "<p>开始编辑你的文档...</p>",
  themePreset: "default",
  themeMode: "light",
});

const isPreviewMode = computed(() => props.previewMode);

const emit = defineEmits<{
  update: [content: JSONContent];
}>();

const editor = shallowRef<Editor | null>(null);
const editorError = ref<string | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

useEditorTheme({
  rootRef,
  preset: toRef(props, "themePreset"),
  mode: toRef(props, "themeMode"),
});

type BlockPickerMenuInstance = {
  activate: (state: SlashCommandState) => void;
  openInsert: (context: import("@/components/tools/block-menu").BlockInsertContext) => void;
  hide: () => void;
  updateQuery: (query: string) => void;
};

const blockPickerMenuRef = ref<BlockPickerMenuInstance | null>(null);

const {
  shouldShowHeaderNav,
  shouldShowFooterNav,
  resolvedExtensionGates,
  toolbarConfig,
  showStatusShortcutHints,
  uiFlags,
  showBlockPickerMenu,
} = useEditorFeatures(props);

const { totalPages, zoomLevel, calculatePages, initPageCssVariables } =
  useEditorPagination(containerRef);
const isFirstInit = ref(true);
const isInitializing = ref(false);

const { visible: outlinePanelVisible } = provideOutlinePanel();

const showOutlinePanel = computed(
  () =>
    resolvedExtensionGates.value.outline &&
    outlinePanelVisible.value &&
    toolbarConfig.value.outline,
);

useEditorI18n(props);

const getEditorContent = (): JSONContent | null => {
  try {
    return editor.value?.getJSON() ?? null;
  } catch {
    return null;
  }
};

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

const normalizeInitialContent = (
  content: string | JSONContent | undefined,
): string | JSONContent => {
  if (!content) return EMPTY_DOC;
  if (typeof content === "string") return content;
  if (content.type === "doc") return content;
  return EMPTY_DOC;
};

const getInitialContent = (): string | JSONContent => {
  if (!isFirstInit.value && editor.value) {
    const currentContent = getEditorContent();
    if (currentContent) return currentContent;
  }
  return normalizeInitialContent(props.initialContent);
};

const initEditor = async () => {
  if (isInitializing.value) return;

  try {
    isInitializing.value = true;

    const initialContentToUse = getInitialContent();
    const gates = resolvedExtensionGates.value;

    if (isFirstInit.value) {
      isFirstInit.value = false;
    }

    const extensions = buildEditorExtensions({
      features: gates,
      outline: {
        scrollParent: () => containerRef.value ?? window,
      },
      officePaste: {
        onPasteFromOfficeWithImages: () =>
          Modal.info({
            title: t("editor.officePasteImageTitle"),
            content: t("editor.officePasteImageBody"),
          }),
      },
    });

    if (!props.readonly && !isPreviewMode.value && gates.dragHandle) {
      extensions.push(
        DragHandleExtension.configure({
          onOpenInsertMenu: (context) => blockPickerMenuRef.value?.openInsert(context),
          onCloseInsertMenu: () => blockPickerMenuRef.value?.hide(),
        }),
      );
    }

    if (gates.slashCommand) {
      extensions.push(
        SlashCommandExtension.configure({
          onActivate: (state: SlashCommandState) => blockPickerMenuRef.value?.activate(state),
          onDeactivate: () => blockPickerMenuRef.value?.hide(),
          onQueryChange: (query: string) => blockPickerMenuRef.value?.updateQuery(query),
        }),
      );
    }

    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
    }

    await nextTick();

    editor.value = new Editor({
      editable: !props.readonly && !isPreviewMode.value,
      extensions,
      content: initialContentToUse,
      editorProps: {
        attributes: { class: "document-editor-content" },
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
    console.error("[YanivEditor] Editor initialization failed:", error);
    editorError.value = "编辑器初始化失败";
  } finally {
    isInitializing.value = false;
  }
};

const destroyEditor = async () => {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
};

onMounted(async () => {
  await initEditor();
});

onBeforeUnmount(async () => {
  await destroyEditor();
});

watch(resolvedExtensionGates, async (next, prev) => {
  if (prev === undefined || !editor.value || isInitializing.value) return;
  if (JSON.stringify(next) === JSON.stringify(prev)) return;
  await nextTick();
  await initEditor();
});

defineExpose({
  getEditor: () => editor.value,
  getJSON: () => editor.value?.getJSON() || null,
  getHTML: () => editor.value?.getHTML() || "",
  getText: () => editor.value?.getText() || "",
});
</script>
