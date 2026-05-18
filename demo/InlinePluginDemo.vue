<template>
  <div class="inline-demo" :data-theme="theme">
    <!-- Section Header -->
    <div class="inline-demo__header">
      <h2 class="inline-demo__title">
        <span class="inline-demo__title-icon">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M9 3v18M3 9h18" />
          </svg>
        </span>
        Inline Editor
      </h2>
      <p class="inline-demo__subtitle">Compact inline editor with hot-swappable feature plugins</p>
    </div>

    <div class="inline-demo__body">
      <!-- Left: Inline Editor -->
      <div class="inline-demo__editor-area">
        <div class="inline-editor-card">
          <!-- Mini toolbar: Dynamically render enabled plugins -->
          <div v-if="hasAnyPlugin" class="inline-toolbar">
            <TransitionGroup name="plugin-toggle">
              <template v-for="plugin in enabledPluginsList" :key="plugin.id">
                <!-- Undo/Redo -->
                <div v-if="plugin.id === 'undoRedo'" class="inline-toolbar__group">
                  <UndoRedoGroup :editor="editor" />
                </div>

                <!-- Heading -->
                <div v-if="plugin.id === 'heading'" class="inline-toolbar__group">
                  <HeadingDropdown :editor="editor" />
                </div>

                <!-- Text Format -->
                <div v-if="plugin.id === 'textFormat'" class="inline-toolbar__group">
                  <TextFormatGroup :editor="editor" />
                </div>

                <!-- Font Size -->
                <div v-if="plugin.id === 'fontSize'" class="inline-toolbar__group">
                  <FontSizeDropdown :editor="editor" />
                </div>

                <!-- List -->
                <div v-if="plugin.id === 'list'" class="inline-toolbar__group">
                  <ListGroup :editor="editor" />
                </div>

                <!-- Align -->
                <div v-if="plugin.id === 'align'" class="inline-toolbar__group">
                  <AlignGroup :editor="editor" />
                </div>

                <!-- Link -->
                <div v-if="plugin.id === 'link'" class="inline-toolbar__group">
                  <LinkButton :editor="editor" />
                </div>

                <!-- Code Block -->
                <div v-if="plugin.id === 'codeBlock'" class="inline-toolbar__group">
                  <CodeBlockButton :editor="editor" />
                </div>

                <!-- Format Clear -->
                <div v-if="plugin.id === 'formatClear'" class="inline-toolbar__group">
                  <FormatClearButton :editor="editor" />
                </div>
              </template>
            </TransitionGroup>
          </div>

          <!-- Empty state when no plugins -->
          <div v-else class="inline-toolbar inline-toolbar--empty">
            <span class="inline-toolbar__empty-text"
              >Toggle plugins from the panel to add toolbar features</span
            >
          </div>

          <!-- Editor Content -->
          <div class="inline-editor-content">
            <EditorContent v-if="editor" :editor="editor" />
          </div>

          <!-- Status Bar -->
          <div class="inline-editor-footer">
            <span class="inline-editor-footer__stats">
              {{ characterCount }} characters &middot; {{ wordCount }} words
            </span>
            <span class="inline-editor-footer__plugins">
              {{ enabledCount }}/{{ totalCount }} plugins active
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Plugin Control Panel -->
      <div class="inline-demo__panel">
        <div class="plugin-panel">
          <div class="plugin-panel__header">
            <h3 class="plugin-panel__title">Feature Plugins</h3>
            <div class="plugin-panel__actions">
              <button
                class="plugin-panel__btn"
                :class="{ 'plugin-panel__btn--active': enabledCount === totalCount }"
                @click="toggleAll(true)"
              >
                All On
              </button>
              <button
                class="plugin-panel__btn"
                :class="{ 'plugin-panel__btn--active': enabledCount === 0 }"
                @click="toggleAll(false)"
              >
                All Off
              </button>
            </div>
          </div>

          <!-- Preset Buttons -->
          <div class="plugin-panel__presets">
            <button
              v-for="preset in presets"
              :key="preset.id"
              class="preset-btn"
              :class="{ 'preset-btn--active': activePreset === preset.id }"
              @click="applyPreset(preset)"
            >
              <span class="preset-btn__icon">{{ preset.icon }}</span>
              <span class="preset-btn__label">{{ preset.label }}</span>
            </button>
          </div>

          <!-- Plugin List -->
          <div class="plugin-panel__list">
            <div
              v-for="plugin in allPlugins"
              :key="plugin.id"
              class="plugin-item"
              :class="{ 'plugin-item--enabled': plugin.enabled }"
              @click="togglePlugin(plugin.id)"
            >
              <div class="plugin-item__info">
                <span class="plugin-item__icon" :style="{ background: plugin.color }">
                  <component :is="plugin.iconComponent" v-if="plugin.iconComponent" />
                  <span v-else v-html="plugin.iconSvg"></span>
                </span>
                <div class="plugin-item__text">
                  <span class="plugin-item__name">{{ plugin.name }}</span>
                  <span class="plugin-item__desc">{{ plugin.description }}</span>
                </div>
              </div>
              <div class="plugin-item__toggle" :class="{ 'is-on': plugin.enabled }">
                <div class="plugin-item__toggle-track">
                  <div class="plugin-item__toggle-thumb"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  UndoOutlined,
  BoldOutlined,
  FontSizeOutlined,
  OrderedListOutlined,
  AlignLeftOutlined,
  LinkOutlined,
  CodeOutlined,
  ClearOutlined,
  FontColorsOutlined,
} from "@ant-design/icons-vue";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { ref, computed, onMounted, onBeforeUnmount, reactive } from "vue";

import {
  UndoRedoGroup,
  FontSizeDropdown,
  CodeBlockButton,
  LinkButton,
  FormatClearButton,
} from "@/editor";
import { AlignDropdown as AlignGroup } from "@/editor/align";
import { HeadingDropdown } from "@/editor/heading";
import { ListTools as ListGroup } from "@/editor/list";
import { TextFormatButtons as TextFormatGroup } from "@/editor/text-format";

import { FontSize } from "../src/extensions/fontSize";
import "../src/styles/variables.css";
import "../src/styles/base.css";
import "../src/styles/toolbar.css";

defineProps<{
  theme: "light" | "dark";
}>();

interface PluginDef {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  color: string;
  iconComponent?: any;
  iconSvg?: string;
}

// Plugin definitions
const allPlugins = reactive<PluginDef[]>([
  {
    id: "undoRedo",
    name: "Undo / Redo",
    description: "History navigation",
    enabled: true,
    color: "linear-gradient(135deg, #667eea, #764ba2)",
    iconComponent: UndoOutlined,
  },
  {
    id: "heading",
    name: "Heading",
    description: "H1-H6 titles",
    enabled: true,
    color: "linear-gradient(135deg, #f093fb, #f5576c)",
    iconComponent: FontColorsOutlined,
  },
  {
    id: "textFormat",
    name: "Text Format",
    description: "Bold, italic, underline, strike",
    enabled: true,
    color: "linear-gradient(135deg, #4facfe, #00f2fe)",
    iconComponent: BoldOutlined,
  },
  {
    id: "fontSize",
    name: "Font Size",
    description: "Adjust text size",
    enabled: false,
    color: "linear-gradient(135deg, #43e97b, #38f9d7)",
    iconComponent: FontSizeOutlined,
  },
  {
    id: "list",
    name: "Lists",
    description: "Bullet, numbered, task list",
    enabled: true,
    color: "linear-gradient(135deg, #fa709a, #fee140)",
    iconComponent: OrderedListOutlined,
  },
  {
    id: "align",
    name: "Alignment",
    description: "Left, center, right, justify",
    enabled: false,
    color: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    iconComponent: AlignLeftOutlined,
  },
  {
    id: "link",
    name: "Link",
    description: "Insert hyperlinks",
    enabled: false,
    color: "linear-gradient(135deg, #ffecd2, #fcb69f)",
    iconComponent: LinkOutlined,
  },
  {
    id: "codeBlock",
    name: "Code Block",
    description: "Syntax highlighted code",
    enabled: false,
    color: "linear-gradient(135deg, #89f7fe, #66a6ff)",
    iconComponent: CodeOutlined,
  },
  {
    id: "formatClear",
    name: "Clear Format",
    description: "Remove all formatting",
    enabled: false,
    color: "linear-gradient(135deg, #fddb92, #d1fdff)",
    iconComponent: ClearOutlined,
  },
]);

// Presets
const presets = [
  {
    id: "minimal",
    label: "Minimal",
    icon: "1",
    plugins: ["undoRedo", "textFormat"],
  },
  {
    id: "writer",
    label: "Writer",
    icon: "2",
    plugins: ["undoRedo", "heading", "textFormat", "list"],
  },
  {
    id: "standard",
    label: "Standard",
    icon: "3",
    plugins: ["undoRedo", "heading", "textFormat", "fontSize", "list", "align", "link"],
  },
  {
    id: "full",
    label: "Full",
    icon: "4",
    plugins: [
      "undoRedo",
      "heading",
      "textFormat",
      "fontSize",
      "list",
      "align",
      "link",
      "codeBlock",
      "formatClear",
    ],
  },
];

const activePreset = ref("writer");

const enabledPluginsList = computed(() => allPlugins.filter((p) => p.enabled));
const enabledCount = computed(() => allPlugins.filter((p) => p.enabled).length);
const totalCount = computed(() => allPlugins.length);
const hasAnyPlugin = computed(() => enabledCount.value > 0);

function togglePlugin(id: string) {
  const plugin = allPlugins.find((p) => p.id === id);
  if (plugin) {
    plugin.enabled = !plugin.enabled;
    activePreset.value = "";
  }
}

function toggleAll(state: boolean) {
  allPlugins.forEach((p) => {
    p.enabled = state;
  });
  activePreset.value = state ? "full" : "";
}

function applyPreset(preset: (typeof presets)[0]) {
  allPlugins.forEach((p) => {
    p.enabled = preset.plugins.includes(p.id);
  });
  activePreset.value = preset.id;
}

// Editor
const editor = ref<Editor | null>(null);
const characterCount = computed(() => editor.value?.storage.characterCount?.characters() || 0);
const wordCount = computed(() => editor.value?.storage.characterCount?.words() || 0);

const inlineContent = `<h2>Inline Editor Demo</h2>
<p>This is a <strong>compact inline editor</strong> with a <em>pluggable</em> toolbar system. Try toggling the plugins on the right panel!</p>
<ul>
  <li>Each plugin can be <strong>added or removed</strong> at runtime</li>
  <li>The toolbar updates <em>instantly</em> with smooth animations</li>
  <li>Choose from presets or customize your own combination</li>
</ul>
<p>This editor is perfect for <strong>comments</strong>, <strong>chat messages</strong>, <strong>inline editing</strong>, and any scenario where a full-page editor is too heavy.</p>`;

onMounted(() => {
  editor.value = new Editor({
    content: inlineContent,
    extensions: [
      StarterKit.configure({
        underline: false,
      }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: "inline-prose",
      },
    },
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
/* ===== Layout ===== */
.inline-demo {
  max-width: 1200px;
  padding: 0 24px;
  margin: 0 auto;
}

.inline-demo__header {
  margin-bottom: 40px;
  text-align: center;
}

.inline-demo__title {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin: 0 0 12px;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.inline-demo__title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
}

.inline-demo__subtitle {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.75);
}

.inline-demo__body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

/* ===== Inline Editor Card ===== */
.inline-demo__editor-area {
  min-width: 0;
}

.inline-editor-card {
  overflow: hidden;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, rgba(0, 0, 0, 0.08));
  border-radius: 16px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  transition: box-shadow 0.3s ease;
}

.inline-editor-card:focus-within {
  box-shadow:
    0 8px 32px rgba(102, 126, 234, 0.12),
    0 0 0 2px rgba(102, 126, 234, 0.2);
}

/* ===== Inline Toolbar ===== */
.inline-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  min-height: 48px;
  padding: 8px 12px;
  background: var(--toolbar-bg, #fafbfc);
  border-bottom: 1px solid var(--card-border, rgba(0, 0, 0, 0.06));
}

.inline-toolbar--empty {
  justify-content: center;
}

.inline-toolbar__empty-text {
  font-size: 13px;
  font-style: italic;
  color: var(--text-muted, #999);
}

.inline-toolbar__group {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 0 4px;
  border-right: 1px solid var(--toolbar-divider, rgba(0, 0, 0, 0.06));
}

.inline-toolbar__group:last-child {
  border-right: none;
}

/* Plugin toggle animation */
.plugin-toggle-enter-active {
  animation: plugin-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.plugin-toggle-leave-active {
  animation: plugin-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes plugin-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes plugin-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.9);
  }
}

/* ===== Editor Content ===== */
.inline-editor-content {
  min-height: 280px;
  max-height: 500px;
  padding: 20px 24px;
  overflow-y: auto;
}

.inline-editor-content :deep(.inline-prose) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-primary, #1a1a1a);
  outline: none;
}

.inline-editor-content :deep(.inline-prose p) {
  margin: 0 0 0.75em;
}

.inline-editor-content :deep(.inline-prose h1),
.inline-editor-content :deep(.inline-prose h2),
.inline-editor-content :deep(.inline-prose h3) {
  margin: 1.2em 0 0.4em;
  font-weight: 650;
  line-height: 1.3;
}

.inline-editor-content :deep(.inline-prose h1) {
  font-size: 1.8em;
}

.inline-editor-content :deep(.inline-prose h2) {
  font-size: 1.4em;
}

.inline-editor-content :deep(.inline-prose h3) {
  font-size: 1.15em;
}

.inline-editor-content :deep(.inline-prose h2:first-child) {
  margin-top: 0;
}

.inline-editor-content :deep(.inline-prose ul),
.inline-editor-content :deep(.inline-prose ol) {
  padding-left: 1.5em;
  margin: 0 0 0.75em;
}

.inline-editor-content :deep(.inline-prose li) {
  margin-bottom: 0.25em;
}

.inline-editor-content :deep(.inline-prose blockquote) {
  padding: 0.5em 1em;
  margin: 1em 0;
  background: rgba(102, 126, 234, 0.04);
  border-left: 3px solid #667eea;
  border-radius: 0 8px 8px 0;
}

.inline-editor-content :deep(.inline-prose code) {
  padding: 2px 6px;
  font-size: 0.88em;
  color: #e11d48;
  background: #fef2f2;
  border-radius: 4px;
}

.inline-editor-content :deep(.inline-prose a) {
  color: #667eea;
  text-decoration: underline;
}

.inline-editor-content :deep(.inline-prose .is-empty::before) {
  float: left;
  height: 0;
  color: #999;
  pointer-events: none;
  content: attr(data-placeholder);
}

/* ===== Editor Footer ===== */
.inline-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-muted, #999);
  background: var(--toolbar-bg, #fafbfc);
  border-top: 1px solid var(--card-border, rgba(0, 0, 0, 0.06));
}

.inline-editor-footer__plugins {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px 8px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 10px;
}

/* ===== Plugin Panel ===== */
.inline-demo__panel {
  position: sticky;
  top: 24px;
}

.plugin-panel {
  overflow: hidden;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, rgba(0, 0, 0, 0.08));
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.plugin-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--card-border, rgba(0, 0, 0, 0.06));
}

.plugin-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--text-primary, #1a1a1a);
}

.plugin-panel__actions {
  display: flex;
  gap: 6px;
}

.plugin-panel__btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #999);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--card-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  transition: all 0.2s;
}

.plugin-panel__btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.04);
  border-color: rgba(102, 126, 234, 0.3);
}

.plugin-panel__btn--active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.3);
}

/* ===== Presets ===== */
.plugin-panel__presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--card-border, rgba(0, 0, 0, 0.06));
}

.preset-btn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 10px 4px;
  cursor: pointer;
  background: var(--preset-bg, #f8f9fa);
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--preset-hover-bg, #f0f1f3);
  transform: translateY(-1px);
}

.preset-btn--active {
  background: rgba(102, 126, 234, 0.06);
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.preset-btn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
}

.preset-btn__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666);
}

/* ===== Plugin List ===== */
.plugin-panel__list {
  max-height: 440px;
  padding: 8px;
  overflow-y: auto;
}

.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.plugin-item:hover {
  background: var(--item-hover-bg, rgba(0, 0, 0, 0.03));
}

.plugin-item--enabled {
  background: var(--item-active-bg, rgba(102, 126, 234, 0.04));
}

.plugin-item__info {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.plugin-item__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 14px;
  color: #fff;
  border-radius: 8px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.plugin-item--enabled .plugin-item__icon {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.plugin-item:hover .plugin-item__icon {
  transform: scale(1.05);
}

.plugin-item__icon .anticon {
  font-size: 15px;
}

.plugin-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.plugin-item__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary, #1a1a1a);
}

.plugin-item__desc {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.3;
  color: var(--text-muted, #999);
  white-space: nowrap;
}

/* ===== Toggle Switch ===== */
.plugin-item__toggle {
  flex-shrink: 0;
  margin-left: 8px;
}

.plugin-item__toggle-track {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--toggle-off-bg, #ddd);
  border-radius: 10px;
  transition: background 0.25s ease;
}

.plugin-item__toggle.is-on .plugin-item__toggle-track {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.plugin-item__toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.plugin-item__toggle.is-on .plugin-item__toggle-thumb {
  transform: translateX(16px);
}

/* ===== Dark Theme ===== */
.inline-demo[data-theme="dark"] {
  --card-bg: #1e1e2e;
  --card-border: rgba(255, 255, 255, 0.08);
  --toolbar-bg: #1a1a2a;
  --toolbar-divider: rgba(255, 255, 255, 0.06);
  --text-primary: #e0e0f0;
  --text-secondary: #a0a0b0;
  --text-muted: #666680;
  --toggle-off-bg: #3a3a4a;
  --item-hover-bg: rgba(255, 255, 255, 0.04);
  --item-active-bg: rgba(102, 126, 234, 0.08);
  --preset-bg: #252535;
  --preset-hover-bg: #2a2a3a;
}

.inline-demo[data-theme="dark"] .inline-editor-content :deep(.inline-prose code) {
  background: rgba(225, 29, 72, 0.12);
}

.inline-demo[data-theme="dark"] .inline-editor-card:focus-within {
  box-shadow:
    0 8px 32px rgba(102, 126, 234, 0.08),
    0 0 0 2px rgba(102, 126, 234, 0.15);
}

/* ===== Responsive ===== */
@media (width <= 768px) {
  .inline-demo__body {
    grid-template-columns: 1fr;
  }

  .inline-demo__panel {
    position: static;
  }

  .plugin-panel__list {
    max-height: 300px;
  }

  .inline-demo__title {
    font-size: 26px;
  }
}
</style>
