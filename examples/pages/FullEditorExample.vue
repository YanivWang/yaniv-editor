<template>
  <div class="demo-page demo-page--full yaniv-editor-host">
    <DemoSubnav title="完整编辑器" :description="fullEntry?.description" />
    <div class="demo-page--full__chrome">
      <DemoControlsBar
        v-model:mode="mode"
        v-model:preset="preset"
        v-model:appearance="appearance"
        v-model:color-mode="colorMode"
      />
      <DemoFeatureOverrides v-model:state="featureOverrides" />
      <DemoIntegrationPanel
        v-model:flags="integration"
        :upload-status="uploadStatus"
        :active-props-snippet="activePropsSnippet"
      />
      <DemoFeatureHints :preset="preset" />
    </div>
    <YanivEditor
      :key="editorKey"
      :mode="mode"
      :preset="preset"
      :appearance="appearance"
      :color-mode="colorMode"
      :features="featuresProp"
      :initial-content="initialContent"
      :upload-image="uploadImageHandler"
      :upload-video="uploadVideoHandler"
      :gallery-images="galleryImagesProp"
      :custom-templates="customTemplatesProp"
      :ai-config="aiConfigProp"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { TemplateItem } from "@/components/editor/template/templates";
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";
import type {
  EditorMode,
  EditorPreset,
  GalleryImage,
  MediaUploadHandler,
  YanivEditorAiConfig,
} from "@/core/editorTypes";

import { registerAppearance, YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

import DemoControlsBar from "../components/DemoControlsBar.vue";
import DemoFeatureHints from "../components/DemoFeatureHints.vue";
import DemoFeatureOverrides from "../components/DemoFeatureOverrides.vue";
import DemoIntegrationPanel from "../components/DemoIntegrationPanel.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import { DEMO_CUSTOM_APPEARANCE_VARS } from "../config/demoAdvanced";
import { getDemoEntry } from "../config/demoCatalog";
import {
  buildFeatureConfig,
  createDefaultOverrideState,
  overridesKey,
} from "../config/demoFeatureOverrides";
import { getSampleContent } from "../config/demoFullEditor";
import {
  buildActivePropsSnippet,
  DEFAULT_INTEGRATION_FLAGS,
  DEMO_CUSTOM_TEMPLATES,
  DEMO_GALLERY_IMAGES,
  DEMO_HOST_AI_CONFIG,
  demoUploadImage,
  demoUploadVideo,
  integrationKey,
  type DemoIntegrationFlags,
} from "../config/demoIntegration";

const fullEntry = getDemoEntry("full-editor");

const mode = ref<EditorMode>("edit");
const preset = ref<EditorPreset>("full");
const appearance = ref<EditorAppearance>("default");
const colorMode = ref<EditorColorMode>("light");
const integration = ref<DemoIntegrationFlags>({ ...DEFAULT_INTEGRATION_FLAGS });
const featureOverrides = ref(createDefaultOverrideState());
const uploadStatus = ref("");

watch(
  appearance,
  (value) => {
    if (value === "custom") {
      registerAppearance("custom", DEMO_CUSTOM_APPEARANCE_VARS);
    }
  },
  { immediate: true },
);

const initialContent = computed(() => getSampleContent(preset.value));
const featuresProp = computed(() => buildFeatureConfig(featureOverrides.value));
const editorKey = computed(
  () =>
    `${preset.value}-${mode.value}-${integrationKey(integration.value)}-${overridesKey(featureOverrides.value)}`,
);
const activePropsSnippet = computed(() => buildActivePropsSnippet(integration.value));

const uploadImageHandler = computed<MediaUploadHandler | undefined>(() =>
  integration.value.customUpload ? handleUploadImage : undefined,
);
const uploadVideoHandler = computed<MediaUploadHandler | undefined>(() =>
  integration.value.customUpload ? handleUploadVideo : undefined,
);
const galleryImagesProp = computed<GalleryImage[] | undefined>(() =>
  integration.value.galleryImages ? DEMO_GALLERY_IMAGES : undefined,
);
const customTemplatesProp = computed<TemplateItem[] | undefined>(() =>
  integration.value.customTemplates ? DEMO_CUSTOM_TEMPLATES : undefined,
);
const aiConfigProp = computed<YanivEditorAiConfig | undefined>(() =>
  integration.value.aiConfig ? DEMO_HOST_AI_CONFIG : undefined,
);

async function handleUploadImage(file: File): Promise<string> {
  uploadStatus.value = `上传中：${file.name}…`;
  try {
    const url = await demoUploadImage(file);
    uploadStatus.value = `已完成：${file.name}`;
    return url;
  } catch {
    uploadStatus.value = `失败：${file.name}`;
    throw new Error("demo upload failed");
  }
}

async function handleUploadVideo(file: File): Promise<string> {
  uploadStatus.value = `上传中：${file.name}…`;
  try {
    const url = await demoUploadVideo(file);
    uploadStatus.value = `已完成：${file.name}`;
    return url;
  } catch {
    uploadStatus.value = `失败：${file.name}`;
    throw new Error("demo upload failed");
  }
}
</script>

<style scoped>
.demo-page--full {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.demo-page--full__chrome {
  flex-shrink: 0;
  max-height: 52vh;
  overflow: auto;
  border-bottom: 1px solid #e8edf3;
}

.demo-page--full :deep(.yaniv-editor) {
  flex: 1;
  min-height: 0;
}
</style>
