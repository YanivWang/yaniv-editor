<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="demo-app editor-mode"
      :data-theme="theme"
      :class="{ 'theme-notion': themePreset === 'notion' }"
    >
      <DemoAppHeader
        subtitle-key="demo.subtitle.fullEditor"
        :theme="theme"
        :locale="locale"
        :theme-preset="themePreset"
        :device-view="deviceView"
        :device-orientation="deviceOrientation"
        show-locale-select
        show-device-switcher
        show-theme-preset
        @toggle-theme="toggleTheme"
        @update:locale="locale = $event"
        @update:theme-preset="handleThemePresetUpdate"
        @update:device-view="deviceView = $event"
        @update:device-orientation="deviceOrientation = $event"
        @device-change="handleDeviceChange"
        @orientation-change="handleOrientationChange"
      />

      <EditorAutoDemo
        :get-editor="getEditorInstance"
        :typing-speed="35"
        :play-label="t('demo.autoDemo.play')"
        :stop-label="t('demo.autoDemo.stop')"
        :replay-label="t('demo.autoDemo.replay')"
      />

      <main class="demo-main">
        <DeviceFrame :device="deviceView" :orientation="deviceOrientation">
          <div class="demo-card">
            <TiptapProEditor
              ref="editorRef"
              :key="themePreset"
              :initial-content="sampleContent"
              :locale="locale"
              v-bind="editorPreset"
              @update="handleUpdate"
            />
          </div>
        </DeviceFrame>
      </main>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme as antTheme } from "ant-design-vue";
import { computed, onMounted, ref, watch } from "vue";

import { DeviceFrame, type Orientation } from "../../src/components/tools/device-switcher";
import { editorPresets } from "../../src/configs/editorPresets";
import TiptapProEditor from "../../src/core/TiptapProEditor.vue";
import { t, useI18n, type LocaleCode } from "../../src/locales";
import { setDeviceView, setOrientation, setTheme, type DeviceView } from "../../src/themes";
import DemoAppHeader from "../components/DemoAppHeader.vue";
import EditorAutoDemo from "../components/EditorAutoDemo.vue";

import type { ThemePreset } from "../../src/configs/editorConfig";
import type { Editor } from "@tiptap/vue-3";

import "../../src/themes/presets/word.css";
import "../../src/themes/presets/notion.css";
import "../../src/themes/presets/github.css";
import "../../src/themes/presets/typora.css";
import "../../src/styles/device-responsive.css";

const theme = ref<"light" | "dark">("light");
const themePreset = ref<ThemePreset>("word");
const locale = ref<LocaleCode>("zh-CN");

const { setLocale } = useI18n();

const isMobileBrowser =
  /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );

const deviceView = ref<DeviceView>(isMobileBrowser ? "mobile" : "pc");
const deviceOrientation = ref<Orientation>("portrait");

const antdTheme = computed(() => ({
  algorithm: theme.value === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
}));

const editorPreset = computed(() =>
  themePreset.value === "notion" ? editorPresets.notion : editorPresets.full,
);

watch(locale, (newLocale) => {
  setLocale(newLocale);
});

onMounted(() => {
  setDeviceView(deviceView.value);
  setTheme(themePreset.value, theme.value);
});

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  setTheme(themePreset.value, theme.value);
};

const handleThemePresetUpdate = (preset: ThemePreset) => {
  themePreset.value = preset;
  setTheme(themePreset.value, theme.value);
};

const handleDeviceChange = (device: DeviceView) => {
  setDeviceView(device);
};

const handleOrientationChange = (orientation: Orientation) => {
  setOrientation(orientation);
};

const sampleContent = `
<h1>Welcome to yaniv-editor!</h1>
<p>This is a <strong>beautiful</strong> and <em>customizable</em> rich-text editor built with:</p>
<ul>
  <li><strong>Tiptap 3</strong> - The headless editor framework</li>
  <li><strong>Vue 3</strong> - The progressive JavaScript framework</li>
  <li><strong>CSS Variables</strong> - Easy theming with Light/Dark mode</li>
</ul>
<h2>Pluggable Toolbar</h2>
<p>Try switching the toolbar preset above. Each feature is independently toggleable.</p>
<blockquote>
  <p><strong>Tip:</strong> Configure AI in .env file to enable the AI button.</p>
</blockquote>
<h2>AI Features</h2>
<p>When configured, the AI button provides continue writing, polish, summarize, and translate.</p>
`;

type TiptapProEditorInstance = {
  getEditor: () => Editor | null;
  getJSON: () => unknown;
  getHTML: () => string;
  getText: () => string;
};

const editorRef = ref<TiptapProEditorInstance | null>(null);
const getEditorInstance = () => editorRef.value?.getEditor() ?? null;

const editorContent = ref<unknown>(null);
const handleUpdate = (content: unknown) => {
  editorContent.value = content;
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
