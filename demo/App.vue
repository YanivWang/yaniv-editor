<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="demo-app"
      :data-theme="theme"
      :class="{
        'editor-mode': !showLanding && demoMode === 'full',
        'inline-mode': !showLanding && demoMode === 'inline',
      }"
    >
      <!-- Landing Page -->
      <LandingPage
        v-if="showLanding"
        :theme="theme"
        @start-demo="handleStartDemo"
        @toggle-theme="toggleTheme"
      />

      <!-- Editor Demo (shown after clicking "Try Demo") -->
      <template v-else>
        <!-- Header -->
        <header class="demo-header">
          <div class="demo-header__content">
            <h1 class="demo-header__title">
              <span class="demo-header__icon">✨</span>
              Tiptap UI Kit
            </h1>
            <p class="demo-header__subtitle">Beautiful Tiptap 3 + Vue 3 Editor Theme</p>
          </div>
          <div class="demo-header__actions">
            <!-- Demo Mode Switcher -->
            <div class="demo-mode-switcher">
              <button
                class="demo-mode-btn"
                :class="{ 'demo-mode-btn--active': demoMode === 'full' }"
                @click="demoMode = 'full'"
              >
                Full Editor
              </button>
              <button
                class="demo-mode-btn"
                :class="{ 'demo-mode-btn--active': demoMode === 'inline' }"
                @click="demoMode = 'inline'"
              >
                Inline + Plugins
              </button>
            </div>

            <DeviceSwitcher
              v-if="demoMode === 'full'"
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
              {{ theme === "light" ? "🌙" : "☀️" }}
            </button>
            <select
              v-if="demoMode === 'full'"
              :value="themePreset"
              class="demo-theme-select"
              @change="handleThemeChange"
            >
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

        <!-- Full Editor Mode -->
        <template v-if="demoMode === 'full'">
          <!-- Auto Demo Controls -->
          <EditorAutoDemo
            :get-editor="getEditorInstance"
            :typing-speed="35"
            play-label="▶ Watch Auto Demo"
            stop-label="⏹ Stop"
            replay-label="↺ Replay Demo"
          />

          <!-- Main Content -->
          <main class="demo-main">
            <!-- Editor Card with Device Frame -->
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
        </template>

        <!-- Inline Plugin Demo Mode -->
        <template v-else>
          <main class="demo-main demo-main--inline">
            <InlinePluginDemo :theme="theme" />
          </main>
        </template>
      </template>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme as antTheme } from "ant-design-vue";
import { ref, computed, watch, onMounted } from "vue";

import {
  DeviceSwitcher,
  DeviceFrame,
  type Orientation,
} from "../src/components/tools/device-switcher";
import { PRESET_CONFIGS } from "../src/configs/editorConfig";
import TiptapProEditor from "../src/core/TiptapProEditor.vue";
import { createI18n, type LocaleCode } from "../src/locales";
import {
  setTheme,
  setDeviceView,
  setOrientation,
  type DeviceView,
  THEME_PRESETS,
} from "../src/themes";

import EditorAutoDemo from "./EditorAutoDemo.vue";
import InlinePluginDemo from "./InlinePluginDemo.vue";
import LandingPage from "./LandingPage.vue";

import type { FeatureFlags, ThemePreset } from "../src/configs/editorConfig";
import type { Editor } from "@tiptap/vue-3";

// 导入主题预设 CSS
import "../src/themes/presets/word.css";
import "../src/themes/presets/notion.css";
import "../src/themes/presets/github.css";
import "../src/themes/presets/typora.css";
import "../src/styles/device-responsive.css";

// Landing page state
const showLanding = ref(true);

// Demo mode: 'full' = full editor, 'inline' = inline + plugins
const demoMode = ref<"full" | "inline">("full");

const handleStartDemo = () => {
  showLanding.value = false;
};

// Theme mode (light/dark)
const theme = ref<"light" | "dark">("light");
const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  setTheme(themePreset.value, theme.value);
};

// Theme preset (word, notion, github, typora)
const themePreset = ref<ThemePreset>("word");
const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  themePreset.value = target.value as ThemePreset;
  setTheme(themePreset.value, theme.value);
};

// 检测手机浏览器，自动使用 mobile 视图
const isMobileBrowser =
  /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );

// Device view (pc, pad, mobile) and orientation
const deviceView = ref<DeviceView>(isMobileBrowser ? "mobile" : "pc");
const deviceOrientation = ref<Orientation>("portrait");

const handleDeviceChange = (device: DeviceView) => {
  setDeviceView(device);
};

const handleOrientationChange = (orientation: Orientation) => {
  setOrientation(orientation);
};

// Ant Design Vue theme (dark mode support)
const antdTheme = computed(() => ({
  algorithm: theme.value === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
}));

// Locale
const locale = ref<LocaleCode>("en-US");
watch(locale, (newLocale) => {
  createI18n({ locale: newLocale });
});

// 根据主题选择功能配置
const currentFeatures = computed<FeatureFlags>(() => {
  // Notion 主题：只显示浮动工具栏和六个点
  if (themePreset.value === "notion") {
    return PRESET_CONFIGS.notion.features;
  }
  // 其他主题：使用完整工具栏
  return PRESET_CONFIGS.full.features;
});

// AI status - check if configured in .env
const aiStatus = ref<string>("Checking...");

onMounted(() => {
  // 初始化主题和设备视图
  setDeviceView(deviceView.value);
  setTheme(themePreset.value, theme.value);

  const apiKey = import.meta.env?.VITE_AI_API_KEY;
  if (apiKey) {
    aiStatus.value = `✅ ${import.meta.env?.VITE_AI_PROVIDER || "AI"} configured`;
  } else {
    aiStatus.value = "❌ No API key in .env";
  }
});

// Sample content
const sampleContent = `
<h1>Welcome to Tiptap UI Kit! 🎉</h1>
<p>This is a <strong>beautiful</strong> and <em>customizable</em> rich-text editor built with:</p>
<ul>
  <li>⚡ <strong>Tiptap 3</strong> - The headless editor framework</li>
  <li>💚 <strong>Vue 3</strong> - The progressive JavaScript framework</li>
  <li>🎨 <strong>CSS Variables</strong> - Easy theming with Light/Dark mode</li>
</ul>
<h2>Pluggable Toolbar</h2>
<p>Try switching the toolbar preset above! Each feature is independently toggleable:</p>
<ul>
  <li>📝 <strong>Default</strong> - Basic formatting features</li>
  <li>✨ <strong>Full</strong> - All features including AI</li>
  <li>🔲 <strong>Minimal</strong> - Just the essentials</li>
</ul>
<blockquote>
  <p>💡 <strong>Tip:</strong> Configure AI in .env file to enable the AI button!</p>
</blockquote>
<h2>AI Features</h2>
<p>When configured, the AI button provides:</p>
<ul>
  <li>✍️ Continue Writing - AI extends your text</li>
  <li>✨ Polish - Improve selected text</li>
  <li>📝 Summarize - Create summaries</li>
  <li>🌐 Translate - Translate to different languages</li>
</ul>
`;

type TiptapProEditorInstance = {
  getEditor: () => Editor | null;
  getJSON: () => unknown;
  getHTML: () => string;
  getText: () => string;
};

// Editor ref and getter for auto demo
const editorRef = ref<TiptapProEditorInstance | null>(null);
const getEditorInstance = () => editorRef.value?.getEditor() ?? null;

// Editor output
const editorContent = ref<any>(null);
const jsonOutput = computed(() => {
  return JSON.stringify(editorContent.value, null, 2) || "// Editor content will appear here";
});

const handleUpdate = (content: any) => {
  editorContent.value = content;
};

// Copy functionality
const copied = ref(false);
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("Failed to copy:", e);
  }
};
</script>

<style>
/* Reset */
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

/* App Container */
.demo-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: #1a1a1a;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: background 0.3s ease;
}

/* Editor mode: fixed height with overflow hidden */
.demo-app.editor-mode {
  height: 100vh;
  overflow: hidden;
}

.demo-app[data-theme="dark"] {
  color: #e5e5e5;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

/* Header */
.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.demo-header__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-header__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.demo-header__icon {
  font-size: 28px;
}

.demo-header__subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.demo-header__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.demo-theme-toggle {
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.demo-theme-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.demo-locale-select,
.demo-toolbar-select,
.demo-theme-select {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  outline: none;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
}

.demo-locale-select option,
.demo-toolbar-select option,
.demo-theme-select option {
  color: #fff;
  background: #1a1a1a;
}

/* Main - 全宽布局 */
.demo-main {
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.demo-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 100%;
}

/* Editor Card - 无边框设计 */
.demo-card {
  overflow: hidden;
  background: #fff;
  border-radius: 0;
  box-shadow: none;
}

.demo-app[data-theme="dark"] .demo-card {
  background: #1e1e1e;
}

/* Info Panel */
.demo-info {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.demo-info__item {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: #fff;
}

.demo-info__value {
  padding: 4px 8px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* Output Panel */
.demo-output {
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.demo-output__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
}

.demo-output__title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.demo-output__copy {
  padding: 6px 12px;
  font-size: 12px;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.demo-output__copy:hover {
  background: rgba(255, 255, 255, 0.3);
}

.demo-output__content {
  max-height: 200px;
  padding: 16px;
  overflow: auto;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
}

/* Footer */
.demo-footer {
  padding: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.demo-footer__links {
  margin-top: 8px;
}

.demo-footer__links a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}

.demo-footer__links a:hover {
  text-decoration: underline;
}

/* ===== Notion 主题特定样式 ===== */

/* 注意：不覆盖 demo-app 背景，保留 header 渐变 */

.theme-notion .demo-main {
  padding: 0;
  background: #ffffff;
}

.theme-notion[data-theme="dark"] .demo-main {
  background: #191919;
}

.theme-notion .demo-container {
  gap: 0;
  max-width: 100%;
}

.theme-notion .demo-card {
  background: #ffffff;
  border-radius: 0;
  box-shadow: none;
}

.theme-notion[data-theme="dark"] .demo-card {
  background: #191919;
}

/* Notion 主题下隐藏 info 和 output 面板 */
.theme-notion .demo-info,
.theme-notion .demo-output {
  display: none;
}

/* Notion 主题下的工具栏位置调整 */
.theme-notion .word-toolbar {
  position: fixed;
  top: 60px;
  right: 24px;
  left: auto;
  z-index: 100;
  width: auto;
  padding: 8px;
  background: transparent !important;
  border: none !important;
  box-shadow: none;
}

/* Inline mode: scrollable */
.demo-app.inline-mode {
  height: auto;
  min-height: 100vh;
  overflow: auto;
}

.demo-main--inline {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 40px 0;
  overflow: auto;
}

/* Demo Mode Switcher */
.demo-mode-switcher {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
}

.demo-mode-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.demo-mode-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.demo-mode-btn--active {
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (width <= 768px) {
  .demo-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
  }

  .demo-main {
    padding: 20px;
  }

  .demo-info {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
