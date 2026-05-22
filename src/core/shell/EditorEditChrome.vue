<template>
  <ToolbarNav
    v-if="chrome.showHeader && editor"
    :config="toolbarConfig"
    :upload-image="uploadImage"
    :upload-video="uploadVideo"
    :gallery-images="galleryImages"
    :custom-templates="customTemplates"
  />

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
import { BlockPickerMenu } from "@/components/tools/block-menu";
import { FloatingMenu } from "@/components/tools/floating-menu";
import { ToolbarNav } from "@/components/tools/header-nav";
import { ImageToolbar } from "@/components/tools/image-toolbar";
import { LinkBubbleMenu } from "@/components/tools/link-bubble";
import { MentionSuggestionMenu } from "@/components/tools/mention-suggestion";
import { TableToolbar } from "@/components/tools/table-toolbar";
import { VideoToolbar } from "@/components/tools/video-toolbar";
import { useYanivEditor } from "@/core/editorContext";
import type { GalleryImage, MediaUploadHandler } from "@/core/editorTypes";
import { useEditorRuntimeContext } from "@/core/runtime/editorRuntimeContext";
import type { FullChromePolicy } from "@/core/runtime/types";

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
