<template>
  <div class="document-toolbar-container">
    <div class="document-toolbar">
      <!-- 左侧：平铺主流程（编辑 → 字体 → 段落 → 插入） -->
      <div class="toolbar-left">
        <!-- 编辑 -->
        <div
          v-if="showSection.history"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionHistory')"
        >
          <div
            v-if="config.undoRedo || config.formatPainter || config.clearFormat"
            class="tool-group"
          >
            <UndoRedoButton v-if="config.undoRedo" />
            <FormatPainterButton v-if="config.formatPainter" />
            <ClearFormatButton v-if="config.clearFormat" />
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

          <div
            v-if="config.textFormat || config.subscriptSuperscript || config.colorPicker"
            class="tool-group"
          >
            <TextFormatButtons v-if="config.textFormat" />
            <SubscriptSuperscriptButton v-if="config.subscriptSuperscript" />
            <template v-if="config.colorPicker">
              <ColorPicker
                :icon="TextColorIcon"
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
            </template>
          </div>
        </div>

        <!-- 段落 -->
        <div
          v-if="showSection.paragraph"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionParagraph')"
        >
          <div v-if="config.heading || config.list || config.align" class="tool-group">
            <HeadingControl v-if="config.heading" variant="dropdown" />
            <ListTools v-if="config.list" :show-task-list="true" />
            <AlignDropdown v-if="config.align" />
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

          <div v-if="config.codeBlock || config.math" class="tool-group">
            <CodeBlockDropdown v-if="config.codeBlock" />
            <MathButton v-if="config.math" />
          </div>

          <div v-if="config.word || config.template || config.gallery" class="tool-group">
            <WordButton v-if="config.word" />
            <TemplateButton v-if="config.template" :custom-templates="customTemplates" />
            <GalleryButton v-if="config.gallery" :images="galleryImages" />
          </div>
        </div>

        <slot name="extra" />
      </div>

      <!-- 右侧：工具 + 智能 + 宿主扩展 -->
      <div v-if="showRightBar" class="toolbar-right">
        <div
          v-if="showSection.tools"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionTools')"
        >
          <div v-if="config.searchReplace || config.outline" class="tool-group">
            <FindReplaceButton
              v-if="config.searchReplace"
              :hotkeys-enabled="!!config.searchReplace"
            />
            <OutlineToggleButton v-if="config.outline" />
          </div>
        </div>

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

        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ToolbarNav - 公共工具栏组件
 * @description 平铺顶栏：左（编辑 → 字体 → 段落 → 插入）| 右（工具 → 智能 → slot）
 */
import { HighlightOutlined, ThunderboltOutlined } from "@ant-design/icons-vue";
import { computed, useSlots } from "vue";

import { AlignDropdown } from "@/components/editor/align";
import { CodeBlockDropdown } from "@/components/editor/code-block";
import { ColorPicker, TextColorIcon } from "@/components/editor/color";
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

interface Props {
  editor?: Editor | null;
  config?: ToolbarToolsConfig;
  uploadImage?: MediaUploadHandler;
  uploadVideo?: MediaUploadHandler;
  galleryImages?: GalleryImage[];
  customTemplates?: TemplateItem[];
}

const props = defineProps<Props>();
const slots = useSlots();

const editor = useYanivEditor(() => props.editor);

const config = computed(() => ({
  ...FULL_TOOLBAR_CONFIG,
  ...props.config,
}));

/** 平铺信息架构：history | typography | paragraph | insert || tools | assistant */
const showSection = computed(() => {
  const c = config.value;
  const ed = editor.value;
  return {
    history: !!(c.undoRedo || c.formatPainter || c.clearFormat),
    typography: !!(c.font || c.textFormat || c.subscriptSuperscript || c.colorPicker),
    paragraph: !!(c.heading || c.list || c.align),
    insert: !!(
      c.link ||
      c.table ||
      c.image ||
      c.video ||
      c.codeBlock ||
      c.math ||
      c.word ||
      c.template ||
      c.gallery
    ),
    tools: !!(c.searchReplace || c.outline),
    assistant: !!(c.ai && ed),
  };
});

const showRightBar = computed(
  () => showSection.value.tools || showSection.value.assistant || !!slots.right,
);

const { currentTextColor, currentBgColor, setTextColor, setHighlight } =
  useEditorColorState(editor);
</script>

<style lang="scss" scoped>
$dark-selector: "[data-theme=" dark "] &";

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

.document-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: flex-start;
  min-height: 48px;
  padding: 6px 12px;
}

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

.toolbar-left .toolbar-section + .toolbar-section {
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  padding-left: 12px;
  margin-left: auto;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

.toolbar-right .toolbar-section + .toolbar-section {
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

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
