<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="demo-app editor-mode"
      :data-theme="theme"
      :class="{ 'theme-notion': themePreset === 'notion' }"
    >
      <header class="demo-header">
        <div class="demo-header__content">
          <RouterLink class="demo-header__title" :to="{ name: 'home' }">
            <span class="demo-header__icon">T</span>
            Tiptap UI Kit Examples
          </RouterLink>
          <p class="demo-header__subtitle">Full editor example with themes and device preview</p>
        </div>

        <div class="demo-header__actions">
          <nav class="demo-mode-switcher" aria-label="Examples">
            <RouterLink class="demo-mode-btn" :to="{ name: 'full-editor' }">
              Full Editor
            </RouterLink>
            <RouterLink class="demo-mode-btn" :to="{ name: 'inline-plugins' }">
              Inline + Plugins
            </RouterLink>
          </nav>

          <DeviceSwitcher
            v-model="deviceView"
            v-model:orientation="deviceOrientation"
            @change="handleDeviceChange"
            @orientation-change="handleOrientationChange"
          />

          <button
            class="demo-theme-toggle"
            :title="theme === 'light' ? 'Switch to Dark' : 'Switch to Light'"
            @click="toggleTheme"
          >
            {{ theme === "light" ? "Dark" : "Light" }}
          </button>

          <select :value="themePreset" class="demo-theme-select" @change="handleThemeChange">
            <option value="word">Word Style</option>
            <option value="notion">Notion Style</option>
            <option value="github">GitHub Style</option>
            <option value="typora">Typora Style</option>
          </select>

          <select v-model="locale" class="demo-locale-select">
            <option value="en-US">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
          </select>
        </div>
      </header>

      <EditorAutoDemo
        :get-editor="getEditorInstance"
        :typing-speed="35"
        play-label="Watch Auto Demo"
        stop-label="Stop"
        replay-label="Replay Demo"
      />

      <main class="demo-main">
        <DeviceFrame :device="deviceView" :orientation="deviceOrientation">
          <div class="demo-card">
            <TiptapProEditor
              ref="editorRef"
              :key="themePreset"
              :initial-content="sampleContent"
              :locale="locale"
              :features="currentFeatures"
              :version="'advanced'"
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
import { RouterLink } from "vue-router";

import {
  DeviceFrame,
  DeviceSwitcher,
  type Orientation,
} from "../../src/components/tools/device-switcher";
import { PRESET_CONFIGS } from "../../src/configs/editorConfig";
import TiptapProEditor from "../../src/core/TiptapProEditor.vue";
import { createI18n, type LocaleCode } from "../../src/locales";
import { setDeviceView, setOrientation, setTheme, type DeviceView } from "../../src/themes";
import EditorAutoDemo from "../components/EditorAutoDemo.vue";

import type { FeatureFlags, ThemePreset } from "../../src/configs/editorConfig";
import type { Editor } from "@tiptap/vue-3";

import "../../src/themes/presets/word.css";
import "../../src/themes/presets/notion.css";
import "../../src/themes/presets/github.css";
import "../../src/themes/presets/typora.css";
import "../../src/styles/device-responsive.css";

const theme = ref<"light" | "dark">("light");
const themePreset = ref<ThemePreset>("word");
const locale = ref<LocaleCode>("en-US");

const isMobileBrowser =
  /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );

const deviceView = ref<DeviceView>(isMobileBrowser ? "mobile" : "pc");
const deviceOrientation = ref<Orientation>("portrait");

const antdTheme = computed(() => ({
  algorithm: theme.value === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
}));

const currentFeatures = computed<FeatureFlags>(() => {
  if (themePreset.value === "notion") {
    return PRESET_CONFIGS.notion.features;
  }

  return PRESET_CONFIGS.full.features;
});

watch(locale, (newLocale) => {
  createI18n({ locale: newLocale });
});

onMounted(() => {
  setDeviceView(deviceView.value);
  setTheme(themePreset.value, theme.value);
});

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  setTheme(themePreset.value, theme.value);
};

const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  themePreset.value = target.value as ThemePreset;
  setTheme(themePreset.value, theme.value);
};

const handleDeviceChange = (device: DeviceView) => {
  setDeviceView(device);
};

const handleOrientationChange = (orientation: Orientation) => {
  setOrientation(orientation);
};

const sampleContent = `
<h1>Welcome to Tiptap UI Kit!</h1>
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
