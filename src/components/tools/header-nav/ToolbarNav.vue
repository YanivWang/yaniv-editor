<template>
  <div class="document-toolbar-container">
    <div class="document-toolbar">
      <!-- 左侧：基础工具 -->
      <div class="toolbar-left">
        <!-- 文档与编辑 -->
        <div
          v-if="showSection.document"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionDocument')"
        >
          <div v-if="config.undoRedo" class="tool-group">
            <UndoRedoButton />
          </div>

          <div v-if="config.formatPainter" class="tool-group">
            <FormatPainterButton />
          </div>

          <div v-if="config.searchReplace" class="tool-group">
            <FindReplaceButton :hotkeys-enabled="!!config.searchReplace" />
          </div>

          <div v-if="config.outline" class="tool-group">
            <OutlineToggleButton />
          </div>

          <div v-if="config.clearFormat" class="tool-group">
            <ClearFormatButton />
          </div>
        </div>

        <!-- 字体 -->
        <div
          v-if="showSection.typography"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionTypography')"
        >
          <div v-if="config.font" class="tool-group">
            <FontFamilySelect />
            <FontSizeSelect />
          </div>

          <div v-if="config.textFormat || config.codeBlock" class="tool-group">
            <TextFormatButtons v-if="config.textFormat" />
            <CodeBlockDropdown v-if="config.codeBlock" />
          </div>

          <div v-if="config.colorPicker" class="tool-group">
            <ToolbarGroup>
              <ColorPicker
                :icon="FontColorsOutlined"
                type="text"
                :model-value="currentTextColor"
                :title="t('editor.textColor')"
                @select="setTextColor"
              />
              <ColorPicker
                :icon="HighlightOutlined"
                type="background"
                :model-value="currentBgColor"
                :title="t('editor.backgroundColor')"
                @select="setHighlight"
              />
            </ToolbarGroup>
          </div>
        </div>

        <!-- 段落 -->
        <div
          v-if="showSection.paragraph"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionParagraph')"
        >
          <div v-if="config.heading || config.list" class="tool-group">
            <HeadingControl v-if="config.heading" variant="dropdown" />
            <ListTools v-if="config.list" :show-task-list="true" />
          </div>

          <div v-if="config.align" class="tool-group">
            <AlignDropdown />
          </div>
        </div>

        <!-- 插入 -->
        <div
          v-if="showSection.insert"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionInsert')"
        >
          <div
            v-if="config.link || config.table || config.image || config.video"
            class="tool-group"
          >
            <LinkButton v-if="config.link" />
            <TableButton v-if="config.table" />
            <ImageUpload v-if="config.image" :upload-image="uploadImage" />
            <VideoUpload v-if="config.video" :upload-video="uploadVideo" />
          </div>

          <div v-if="config.subscriptSuperscript || config.math" class="tool-group">
            <SubscriptSuperscriptButton v-if="config.subscriptSuperscript" />
            <MathButton v-if="config.math" />
          </div>

          <div v-if="config.word" class="tool-group">
            <WordButton />
          </div>

          <div v-if="config.template || config.gallery" class="tool-group">
            <TemplateButton v-if="config.template" :custom-templates="customTemplates" />
            <GalleryButton v-if="config.gallery" :images="galleryImages" />
          </div>
        </div>

        <!-- 智能 -->
        <div
          v-if="showSection.assistant"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionAssistant')"
        >
          <div v-if="config.ai && editor" class="tool-group">
            <AiMenuButton
              :editor="editor"
              :icon="ThunderboltOutlined"
              :label="t('editor.ai')"
              :title="t('editor.ai')"
            />
          </div>
        </div>

        <slot name="extra" />
      </div>

      <!-- 右侧：宿主自定义工具 -->
      <div v-if="$slots.right" class="toolbar-right">
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ToolbarNav - 公共工具栏组件
 * @description 可配置的工具栏组件，支持通过配置控制显示哪些工具
 * @example
 * ```vue
 * <ToolbarNav :config="{ textFormat: true, colorPicker: true }" />
 * ```
 */
import { FontColorsOutlined, HighlightOutlined, ThunderboltOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarGroup } from "@/components/base";
import { AlignDropdown } from "@/components/editor/align";
import { CodeBlockDropdown } from "@/components/editor/code-block";
import { ColorPicker } from "@/components/editor/color";
import FindReplaceButton from "@/components/editor/find-replace/FindReplaceButton.vue";
import { FontFamilySelect, FontSizeSelect } from "@/components/editor/font";
import { ClearFormatButton } from "@/components/editor/format-clear";
import { FormatPainterButton } from "@/components/editor/format-painter";
import { GalleryButton } from "@/components/editor/gallery";
import { HeadingControl } from "@/components/editor/heading";
import { ImageUpload } from "@/components/editor/image";
import { LinkButton } from "@/components/editor/link";
import { ListTools } from "@/components/editor/list";
import { MathButton } from "@/components/editor/math";
import { OutlineToggleButton } from "@/components/editor/outline";
import { SubscriptSuperscriptButton } from "@/components/editor/subscript-superscript";
import { TableButton } from "@/components/editor/table";
import { TemplateButton } from "@/components/editor/template";
import type { TemplateItem } from "@/components/editor/template/templates";
import { TextFormatButtons } from "@/components/editor/text-format";
import { UndoRedoButton } from "@/components/editor/undo-redo";
import { VideoUpload } from "@/components/editor/video";
import WordButton from "@/components/editor/word/WordButton.vue";
import { useEditorColorState } from "@/composables/useEditorColorState";
import { useYanivEditor } from "@/core/editorContext";
import type { GalleryImage, MediaUploadHandler } from "@/core/editorTypes";
import { AiMenuButton } from "@/features/ai";
import { t } from "@/locales";

import { FULL_TOOLBAR_CONFIG } from "./toolbarConfig";

import type { ToolbarToolsConfig } from "./toolbarConfig";
import type { Editor } from "@tiptap/vue-3";

// ===== Props =====
interface Props {
  /** 独立拼装时传入；YanivEditor 内可省略 */
  editor?: Editor | null;
  /** 工具栏配置，控制显示哪些工具 */
  config?: ToolbarToolsConfig;
  /** 图片上传函数 */
  uploadImage?: MediaUploadHandler;
  /** 视频上传函数 */
  uploadVideo?: MediaUploadHandler;
  /** 外部图库图片源 */
  galleryImages?: GalleryImage[];
  /** 自定义模板列表 */
  customTemplates?: TemplateItem[];
}

const props = defineProps<Props>();

const editor = useYanivEditor(() => props.editor);

const config = computed(() => ({
  ...FULL_TOOLBAR_CONFIG,
  ...props.config,
}));

/** 工具栏分区显隐（信息架构：文档 / 字体 / 段落 / 插入 / 智能） */
const showSection = computed(() => {
  const c = config.value;
  const ed = editor.value;
  return {
    document: !!(c.undoRedo || c.formatPainter || c.searchReplace || c.outline || c.clearFormat),
    typography: !!(c.font || c.textFormat || c.codeBlock || c.colorPicker),
    paragraph: !!(c.heading || c.list || c.align),
    insert: !!(
      c.link ||
      c.table ||
      c.image ||
      c.video ||
      c.subscriptSuperscript ||
      c.math ||
      c.word ||
      c.template ||
      c.gallery
    ),
    assistant: !!(c.ai && ed),
  };
});

const { currentTextColor, currentBgColor, setTextColor, setHighlight } =
  useEditorColorState(editor);
</script>

<style lang="scss" scoped>
// Dark 模式选择器变量（用于统一管理暗色主题样式）
$dark-selector: "[data-theme=" dark "] &";

/* ===== 工具栏容器 ===== */
.document-toolbar-container {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);

  #{$dark-selector} {
    background: #1f1f1f;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
  }
}

/* ===== 工具栏主体 ===== */
.document-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: flex-start;
  min-height: 48px;
  padding: 6px 12px;
}

/* ===== 工具栏左侧区域 ===== */
.toolbar-left {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  min-width: 0;
}

.toolbar-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-section + .toolbar-section {
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

/* ===== 工具栏右侧区域 ===== */
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-left: 12px;
  margin-left: auto;
}

/* ===== 工具组 ===== */
.tool-group {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 0 6px;
  border-right: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-right-color: #434343;
  }

  &:last-child {
    border-right: none;
  }

  &:first-child {
    padding-left: 0;
  }
}
</style>
