<template>
  <div class="document-toolbar-container">
    <div class="document-toolbar" role="toolbar" :aria-label="t('editor.toolbarLabel')">
      <div class="toolbar-sections">
        <!-- 编辑 -->
        <section
          v-if="showSection.history"
          class="toolbar-section toolbar-section--history"
          :aria-label="t('editor.toolbarSectionHistory')"
        >
          <div
            v-if="config.undoRedo || config.formatPainter || config.clearFormat"
            class="tool-row"
          >
            <UndoRedoButton v-if="config.undoRedo" />
            <FormatPainterButton v-if="config.formatPainter" />
            <ClearFormatButton v-if="config.clearFormat" />
          </div>
        </section>

        <!-- 字体 -->
        <section
          v-if="showSection.typography"
          class="toolbar-section toolbar-section--typography"
          :aria-label="t('editor.toolbarSectionTypography')"
        >
          <div v-if="config.font" class="tool-row tool-row--font">
            <FontFamilySelect />
            <FontSizeSelect />
          </div>

          <div
            v-if="config.textFormat || config.subscriptSuperscript || config.colorPicker"
            class="tool-row"
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
                :icon="BackgroundColorIcon"
                type="background"
                :model-value="currentBgColor"
                :title="t('editor.backgroundColor')"
                @select="setHighlight"
              />
            </template>
          </div>
        </section>

        <!-- 段落 -->
        <section
          v-if="showSection.paragraph"
          class="toolbar-section toolbar-section--paragraph"
          :aria-label="t('editor.toolbarSectionParagraph')"
        >
          <div v-if="config.heading || config.list || config.align" class="tool-row">
            <HeadingControl v-if="config.heading" variant="dropdown" />
            <ListTools v-if="config.list" :show-task-list="true" />
            <AlignDropdown v-if="config.align" />
          </div>
        </section>

        <!-- 插入 -->
        <section
          v-if="showSection.insert"
          class="toolbar-section toolbar-section--insert"
          :aria-label="t('editor.toolbarSectionInsert')"
        >
          <div v-if="config.link || config.table || config.image || config.video" class="tool-row">
            <LinkButton v-if="config.link" />
            <TableButton v-if="config.table" />
            <ImageUpload v-if="config.image" :upload-image="uploadImage" />
            <VideoUpload v-if="config.video" :upload-video="uploadVideo" />
          </div>

          <div v-if="config.codeBlock || config.math" class="tool-row">
            <CodeBlockDropdown v-if="config.codeBlock" />
            <MathButton v-if="config.math" />
          </div>
        </section>

        <!-- 文档资源 -->
        <section
          v-if="showSection.document"
          class="toolbar-section toolbar-section--document"
          :aria-label="t('editor.toolbarSectionDocument')"
        >
          <div v-if="config.word || config.template || config.gallery" class="tool-row">
            <WordButton v-if="config.word" />
            <TemplateButton v-if="config.template" :custom-templates="customTemplates" />
            <GalleryButton v-if="config.gallery" :images="galleryImages" />
          </div>
        </section>

        <!-- 工具 -->
        <section
          v-if="showSection.tools"
          class="toolbar-section toolbar-section--tools"
          :aria-label="t('editor.toolbarSectionTools')"
        >
          <div v-if="config.searchReplace || config.outline" class="tool-row">
            <FindReplaceButton
              v-if="config.searchReplace"
              :hotkeys-enabled="!!config.searchReplace"
            />
            <OutlineToggleButton v-if="config.outline" />
          </div>
        </section>

        <!-- 智能 -->
        <section
          v-if="showSection.assistant"
          class="toolbar-section toolbar-section--assistant"
          :aria-label="t('editor.toolbarSectionAssistant')"
        >
          <div v-if="config.ai && editor" class="tool-row">
            <AiMenuButton
              :editor="editor"
              :icon="ThunderboltOutlined"
              :label="t('editor.ai')"
              :title="t('editor.ai')"
            />
          </div>
        </section>

        <section v-if="slots.extra" class="toolbar-section toolbar-section--slot">
          <slot name="extra" />
        </section>

        <section v-if="slots.right" class="toolbar-section toolbar-section--slot">
          <slot name="right" />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ToolbarNav - 公共工具栏组件
 * @description 自然换行工具带：编辑 → 字体 → 段落 → 插入 → 文档 → 工具 → 智能
 */
import { ThunderboltOutlined } from "@ant-design/icons-vue";
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from "vue";

import { AlignDropdown } from "@/components/editor/align";
import { CodeBlockDropdown } from "@/components/editor/code-block";
import { BackgroundColorIcon, ColorPicker, TextColorIcon } from "@/components/editor/color";
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

import { COMPACT_TOOLBAR_CONFIG, FULL_TOOLBAR_CONFIG } from "./toolbarConfig";

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
const isMobileToolbar = ref(false);

let mobileToolbarQuery: MediaQueryList | null = null;

function updateMobileToolbar(event?: MediaQueryListEvent | MediaQueryList): void {
  isMobileToolbar.value = !!event?.matches;
}

onMounted(() => {
  mobileToolbarQuery = window.matchMedia("(width <= 768px)");
  updateMobileToolbar(mobileToolbarQuery);
  mobileToolbarQuery.addEventListener("change", updateMobileToolbar);
});

onBeforeUnmount(() => {
  mobileToolbarQuery?.removeEventListener("change", updateMobileToolbar);
  mobileToolbarQuery = null;
});

const config = computed(() => {
  const baseConfig = {
    ...FULL_TOOLBAR_CONFIG,
    ...props.config,
  };

  return isMobileToolbar.value
    ? {
        ...baseConfig,
        ...COMPACT_TOOLBAR_CONFIG,
      }
    : baseConfig;
});

/** 平铺信息架构：history | typography | paragraph | insert | document | tools | assistant */
const showSection = computed(() => {
  const c = config.value;
  const ed = editor.value;
  return {
    history: !!(c.undoRedo || c.formatPainter || c.clearFormat),
    typography: !!(c.font || c.textFormat || c.subscriptSuperscript || c.colorPicker),
    paragraph: !!(c.heading || c.list || c.align),
    insert: !!(c.link || c.table || c.image || c.video || c.codeBlock || c.math),
    document: !!(c.word || c.template || c.gallery),
    tools: !!(c.searchReplace || c.outline),
    assistant: !!(c.ai && ed),
  };
});

const { currentTextColor, currentBgColor, setTextColor, setHighlight } =
  useEditorColorState(editor);
</script>

<style lang="scss" scoped>
$dark-selector: "[data-theme=" dark "] &";

.document-toolbar-container {
  z-index: 1000;
  flex-shrink: 0;
  width: 100%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);

  #{$dark-selector} {
    background: #1f1f1f;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
  }
}

.document-toolbar {
  min-height: 48px;
  padding: 6px 12px;
}

.toolbar-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.toolbar-section {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  min-height: 32px;
}

.toolbar-section + .toolbar-section {
  padding-left: 8px;
  margin-left: 8px;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

.tool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  min-width: 0;
}

.tool-row + .tool-row {
  padding-left: 6px;
  border-left: 1px solid #e8e8e8;

  #{$dark-selector} {
    border-left-color: #434343;
  }
}

@media (width <= 768px) {
  .document-toolbar {
    padding: 6px 8px;
  }

  .toolbar-section + .toolbar-section {
    padding-left: 6px;
    margin-left: 6px;
  }

  .tool-row + .tool-row {
    padding-left: 4px;
  }
}
</style>
