<template>
  <ToolbarNav
    v-if="chrome.showHeader && editor"
    :config="toolbarConfig"
    :upload-image="uploadImage"
    :upload-video="uploadVideo"
    :gallery-images="galleryImages"
    :custom-templates="customTemplates"
  />

  <!-- 面板与 Ctrl/Cmd+F 只依赖能力 gate，不依赖顶栏是否显示 -->
  <FindReplaceDialog v-if="profile.gates.searchReplace && editor" />

  <LinkBubbleMenu v-if="uiFlags.linkBubble && editor" />

  <TableToolbar v-if="uiFlags.tableTools && editor" :show-mode="presetLayout.tableToolsShowMode" />

  <ImageToolbar v-if="uiFlags.image && editor" />

  <VideoToolbar v-if="uiFlags.video && editor" />

  <FloatingMenu v-if="uiFlags.floatingMenu && editor" :show-ai="profile.gates.ai" />

  <MentionSuggestionMenu v-if="profile.gates.slashCommand && editor" />

  <BlockPickerMenu
    v-if="chrome.showBlockPicker && editor"
    :features="profile.gates"
    :upload-image="uploadImage"
    :upload-video="uploadVideo"
  />
</template>

<script setup lang="ts">
import type { TemplateItem } from "@/components/editor/template/templates";
import { FloatingMenu } from "@/components/tools/floating-menu";
import { ToolbarNav } from "@/components/tools/header-nav";
import { ImageToolbar } from "@/components/tools/image-toolbar";
import { LinkBubbleMenu } from "@/components/tools/link-bubble";
import { useYanivEditor } from "@/core/editorContext";
import type { GalleryImage, MediaUploadHandler } from "@/core/editorTypes";
import { useEditorRuntimeContext } from "@/core/runtime/editorRuntimeContext";
import type { FullChromePolicy } from "@/core/runtime/types";
import { defineGatedAsyncComponent } from "@/shared/gatedAsyncComponent";

/**
 * 由能力 gate 控制显隐的浮层组件按需加载。
 *
 * 这些组件只在对应 gate 打开时渲染，但静态 import 会把它们连同所依赖的扩展模块
 * （如 BlockPickerMenu → slashCommandKey、MentionSuggestionMenu → mentionPluginKey）
 * 一并打进主 chunk，使 `preset="basic"` 的接入方仍要下载 notion 块编辑相关代码。
 * 全部为 `v-if` 门控的叶子组件，无父级 ref 访问，异步化不影响交互时序。
 */
const FindReplaceDialog = defineGatedAsyncComponent("FindReplaceDialog", () =>
  import("@/components/editor/find-replace").then((m) => m.FindReplaceDialog),
);
const TableToolbar = defineGatedAsyncComponent("TableToolbar", () =>
  import("@/components/tools/table-toolbar").then((m) => m.TableToolbar),
);
const VideoToolbar = defineGatedAsyncComponent("VideoToolbar", () =>
  import("@/components/tools/video-toolbar").then((m) => m.VideoToolbar),
);
const MentionSuggestionMenu = defineGatedAsyncComponent("MentionSuggestionMenu", () =>
  import("@/components/tools/mention-suggestion").then((m) => m.MentionSuggestionMenu),
);
const BlockPickerMenu = defineGatedAsyncComponent("BlockPickerMenu", () =>
  import("@/components/tools/block-menu").then((m) => m.BlockPickerMenu),
);

defineProps<{
  chrome: FullChromePolicy;
  uploadImage?: MediaUploadHandler;
  uploadVideo?: MediaUploadHandler;
  galleryImages?: GalleryImage[];
  customTemplates?: TemplateItem[];
}>();

const editor = useYanivEditor();
const { profile, toolbarConfig, presetLayout, uiFlags } = useEditorRuntimeContext();
</script>
