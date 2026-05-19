<template>
  <div v-if="enabled" class="editor-toolbar-container">
    <div class="editor-toolbar">
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
            <UndoRedoButton :editor="editor" :disabled="config.undoRedoDisabled" />
          </div>

          <div v-if="config.formatPainter" class="tool-group">
            <FormatPainterButton :editor="editor" :disabled="config.formatPainterDisabled" />
          </div>

          <div v-if="config.findReplace" class="tool-group">
            <FindReplaceButton :editor="editor" :hotkeys-enabled="!!config.findReplace" />
          </div>

          <div v-if="config.clearFormat" class="tool-group">
            <ClearFormatButton :editor="editor" />
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
            <FontFamilySelect :editor="editor" />
            <FontSizeSelect :editor="editor" />
          </div>

          <div v-if="config.textFormat || config.codeBlock" class="tool-group">
            <TextFormatButtons v-if="config.textFormat" :editor="editor" />
            <CodeBlockDropdown v-if="config.codeBlock" :editor="editor" />
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
            <HeadingDropdown v-if="config.heading" :editor="editor" />
            <ListTools v-if="config.list" :editor="editor" :show-task-list="true" />
          </div>

          <div v-if="config.align" class="tool-group">
            <AlignDropdown :editor="editor" />
          </div>
        </div>

        <!-- 插入 -->
        <div
          v-if="showSection.insert"
          class="toolbar-section"
          role="group"
          :aria-label="t('editor.toolbarSectionInsert')"
        >
          <div v-if="config.link || config.table || config.image" class="tool-group">
            <LinkButton v-if="config.link" :editor="editor" />
            <TableButton v-if="config.table" :editor="editor" />
            <ImageUpload v-if="config.image" :editor="editor" />
            <VideoUpload v-if="config.image" :editor="editor" />
          </div>

          <div v-if="config.subscriptSuperscript" class="tool-group">
            <SubscriptSuperscriptButton :editor="editor" />
          </div>

          <div v-if="config.word" class="tool-group">
            <WordButton :editor="editor" />
          </div>

          <div v-if="config.template || config.gallery" class="tool-group">
            <TemplateButton v-if="config.template" :editor="editor" />
            <GalleryButton v-if="config.gallery" :editor="editor" />
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

      <!-- 右侧：额外工具（如协作开关） -->
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
 * <ToolbarNav :editor="editor" :config="{ textFormat: true, colorPicker: true }" />
 * <ToolbarNav :editor="editor" :enabled="false" /> // 关闭工具栏
 * ```
 */
import { FontColorsOutlined, HighlightOutlined, ThunderboltOutlined } from "@ant-design/icons-vue";
import { computed, ref, watch } from "vue";

import { AiMenuButton } from "@/ai";
import { ToolbarGroup } from "@/base";
import { AlignDropdown } from "@/editor/align";
import { CodeBlockDropdown } from "@/editor/code-block";
import { ColorPicker } from "@/editor/color";
import FindReplaceButton from "@/editor/find-replace/FindReplaceButton.vue";
import { FontFamilySelect, FontSizeSelect } from "@/editor/font";
import { ClearFormatButton } from "@/editor/format-clear";
import { FormatPainterButton } from "@/editor/format-painter";
import { GalleryButton } from "@/editor/gallery";
import { HeadingDropdown } from "@/editor/heading";
import { ImageUpload } from "@/editor/image";
import { LinkButton } from "@/editor/link";
import { ListTools } from "@/editor/list";
import { SubscriptSuperscriptButton } from "@/editor/subscript-superscript";
import { TableButton } from "@/editor/table";
import { TemplateButton } from "@/editor/template";
import { TextFormatButtons } from "@/editor/text-format";
import { UndoRedoButton } from "@/editor/undo-redo";
import { VideoUpload } from "@/editor/video";
import { WordButton } from "@/editor/word";
import { t } from "@/locales";
import { createCommandRunner } from "@/utils/editorCommands";

import { DEFAULT_TOOLBAR_CONFIG } from "./toolbarConfig";

import type { ToolbarToolsConfig } from "./toolbarConfig";
import type { Editor } from "@tiptap/vue-3";

// ===== Props =====
interface Props {
  /** 编辑器实例 */
  editor: Editor | null | undefined;
  /** 工具栏配置，控制显示哪些工具 */
  config?: ToolbarToolsConfig;
  /** 是否启用工具栏，默认为 true */
  enabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => DEFAULT_TOOLBAR_CONFIG,
  enabled: true,
});

const editor = computed(() => props.editor ?? null);

// ===== 合并配置 =====
const config = computed(() => {
  return {
    ...DEFAULT_TOOLBAR_CONFIG,
    ...props.config,
  };
});

/** 工具栏分区显隐（信息架构：文档 / 字体 / 段落 / 插入 / 智能） */
const showSection = computed(() => {
  const c = config.value;
  const ed = editor.value;
  return {
    document: !!(c.undoRedo || c.formatPainter || c.findReplace || c.clearFormat),
    typography: !!(c.font || c.textFormat || c.codeBlock || c.colorPicker),
    paragraph: !!(c.heading || c.list || c.align),
    insert: !!(
      c.link ||
      c.table ||
      c.image ||
      c.subscriptSuperscript ||
      c.word ||
      c.template ||
      c.gallery
    ),
    assistant: !!(c.ai && ed),
  };
});

// ===== 响应式状态 =====
const currentTextColor = ref<string>("#000000");
const currentBgColor = ref<string>("#ffffff");

// ===== 辅助函数 =====
/**
 * 标准化颜色值（确保格式统一）
 */
function normalizeColor(color: string | undefined): string {
  if (!color) return "#000000";
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * 命令执行器
 */
const runCommand = createCommandRunner(editor);

// ===== 颜色应用函数 =====
const setTextColor = (color: string) => {
  currentTextColor.value = color;
  runCommand((chain) => chain.setColor(color))();
};

const setHighlight = (color: string) => {
  currentBgColor.value = color;
  runCommand((chain) => chain.setHighlight({ color }))();
};

// 监听编辑器状态，更新当前颜色
watch(
  () => editor.value?.getAttributes("textStyle"),
  (attrs) => {
    if (attrs?.color) {
      currentTextColor.value = normalizeColor(attrs.color);
    } else {
      currentTextColor.value = "#000000";
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => editor.value?.getAttributes("highlight"),
  (attrs) => {
    if (attrs?.color) {
      currentBgColor.value = normalizeColor(attrs.color);
    } else {
      currentBgColor.value = "#ffffff";
    }
  },
  { deep: true, immediate: true },
);
</script>

<style lang="scss" scoped>
// Dark 模式选择器变量（用于统一管理暗色主题样式）
$dark-selector: ":where(.dark, .dark *) &";

/* ===== 工具栏容器 ===== */
.editor-toolbar-container {
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
.editor-toolbar {
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
