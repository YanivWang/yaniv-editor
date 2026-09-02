<template>
  <div class="document-toolbar-container">
    <div
      ref="toolbarRef"
      class="document-toolbar"
      role="toolbar"
      :aria-label="t('editor.toolbarLabel')"
    >
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
            <ListTools v-if="config.list" />
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
            <FindReplaceButton v-if="config.searchReplace" />
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
import { BackgroundColorIcon, TextColorIcon } from "@/components/editor/color/ColorIcons";
import { FontFamilySelect, FontSizeSelect } from "@/components/editor/font";
import { ClearFormatButton } from "@/components/editor/format-clear";
import { HeadingControl } from "@/components/editor/heading";
import { ImageUpload } from "@/components/editor/image";
import { LinkButton } from "@/components/editor/link";
import { ListTools } from "@/components/editor/list";
import { SubscriptSuperscriptButton } from "@/components/editor/subscript-superscript";
import type { TemplateItem } from "@/components/editor/template/templates";
import { TextFormatButtons } from "@/components/editor/text-format";
import { UndoRedoButton } from "@/components/editor/undo-redo";
import { useEditorColorState } from "@/composables/useEditorColorState";
import { useRovingTabindex } from "@/composables/useRovingTabindex";
import { useYanivEditor } from "@/core/editorContext";
import type { GalleryImage, MediaUploadHandler } from "@/core/editorTypes";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { defineGatedAsyncComponent } from "@/shared/gatedAsyncComponent";

import { COMPACT_TOOLBAR_CONFIG, FULL_TOOLBAR_CONFIG } from "./toolbarConfig";

import type { ToolbarToolsConfig } from "./toolbarConfig";
import type { Editor } from "@tiptap/vue-3";

/**
 * gate / toolbar 配置控制显隐的按钮按需加载。
 *
 * 这些项在默认 preset（`basic` → COMPACT_TOOLBAR_CONFIG）下均为关闭，静态 import 会让
 * 它们连同各自依赖（AI 客户端与适配器、docx/mammoth 封装、KaTeX 封装等）进入主 chunk。
 * 全部为 `v-if` 门控的叶子组件，无父级 ref 访问。
 */
/**
 * ColorPicker 是主 chunk 里最大的单个文件（1008 行，含 office / notion 两套色板数据）。
 * 按钮本身只是个图标，完整的取色面板要等用户点开才用得上。
 *
 * ⚠️ 动态 import 必须指向 `ColorPicker.vue` 本身，不能走 `@/components/editor/color`
 * barrel：同一个 barrel 里的 `ColorIcons` 是静态 import 的（图标画在按钮上，
 * 首屏就要），Rollup 会因此把整个 barrel 连同 ColorPicker 一起留在主 chunk，
 * 异步化就白做了。
 */
const ColorPicker = defineGatedAsyncComponent(
  "ColorPicker",
  () => import("@/components/editor/color/ColorPicker.vue"),
);

const AiMenuButton = defineGatedAsyncComponent("AiMenuButton", () =>
  import("@/features/ai").then((m) => m.AiMenuButton),
);
const FindReplaceButton = defineGatedAsyncComponent("FindReplaceButton", () =>
  import("@/components/editor/find-replace").then((m) => m.FindReplaceButton),
);
const FormatPainterButton = defineGatedAsyncComponent("FormatPainterButton", () =>
  import("@/components/editor/format-painter").then((m) => m.FormatPainterButton),
);
const GalleryButton = defineGatedAsyncComponent("GalleryButton", () =>
  import("@/components/editor/gallery").then((m) => m.GalleryButton),
);
const MathButton = defineGatedAsyncComponent("MathButton", () =>
  import("@/components/editor/math").then((m) => m.MathButton),
);
const OutlineToggleButton = defineGatedAsyncComponent("OutlineToggleButton", () =>
  import("@/components/editor/outline").then((m) => m.OutlineToggleButton),
);
const TableButton = defineGatedAsyncComponent("TableButton", () =>
  import("@/components/editor/table").then((m) => m.TableButton),
);
const TemplateButton = defineGatedAsyncComponent("TemplateButton", () =>
  import("@/components/editor/template").then((m) => m.TemplateButton),
);
const VideoUpload = defineGatedAsyncComponent("VideoUpload", () =>
  import("@/components/editor/video").then((m) => m.VideoUpload),
);
const WordButton = defineGatedAsyncComponent(
  "WordButton",
  () => import("@/components/editor/word/WordButton.vue"),
);

/**
 * 工具栏按 WAI-ARIA APG 的 toolbar 模式收敛为单一 tab stop，内部用方向键移动。
 * 改动前 full preset 下有 18 个 tab stop，键盘用户需按 18 次 Tab 才能越过工具栏。
 */
const toolbarRef = ref<HTMLElement | null>(null);
useRovingTabindex(toolbarRef);

const t = useEditorT();

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

const config = computed<ToolbarToolsConfig>(() => {
  // props.config 已由 applyGatesToToolbarConfig 按 gates 收敛过；
  // 这里用 FULL 补全宿主可能缺省的键，显式 false 仍会覆盖 FULL 的 true。
  const baseConfig: ToolbarToolsConfig = {
    ...FULL_TOOLBAR_CONFIG,
    ...props.config,
  };

  if (!isMobileToolbar.value) return baseConfig;

  // 移动端把 COMPACT 当**掩码**用（取交集），而非覆盖：
  // COMPACT 只能进一步收窄工具带，不能重新打开 gate 已关闭的能力
  // （直接 spread 会让 COMPACT 中硬编码为 true 的 image / ai 绕过 gate 过滤）。
  const masked: ToolbarToolsConfig = {};
  for (const key of Object.keys(baseConfig) as Array<keyof ToolbarToolsConfig>) {
    masked[key] = baseConfig[key] === true && COMPACT_TOOLBAR_CONFIG[key] === true;
  }
  return masked;
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
.document-toolbar {
  padding: 6px 12px;
}

.toolbar-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 0;
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

  // --ye-toolbar-divider 本身随 dark 改写，无需再写 dark 覆盖
  border-left: var(--ye-border-width) solid var(--ye-toolbar-divider);
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
  border-left: var(--ye-border-width) solid var(--ye-toolbar-divider);
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
