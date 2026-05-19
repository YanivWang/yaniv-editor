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
        show-locale-select
        show-theme-preset
        @toggle-theme="toggleTheme"
        @update:locale="locale = $event"
        @update:theme-preset="handleThemePresetUpdate"
      />

      <main class="demo-main">
        <div class="demo-card">
          <YanivEditor
            :key="themePreset"
            :initial-content="sampleContent"
            :locale="locale"
            v-bind="editorPreset"
          />
        </div>
      </main>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme as antTheme } from "ant-design-vue";
import { computed, onMounted, ref, watch } from "vue";

import { editorPresets } from "../../src/configs/editorPresets";
import YanivEditor from "../../src/core/YanivEditor.vue";
import { useI18n, type LocaleCode } from "../../src/locales";
import { setTheme } from "../../src/themes";
import DemoAppHeader from "../components/DemoAppHeader.vue";

import type { ThemePreset } from "../../src/configs/editorConfig";

import "../../src/themes/presets/word.css";
import "../../src/themes/presets/notion.css";
import "../../src/themes/presets/github.css";
import "../../src/themes/presets/typora.css";

const theme = ref<"light" | "dark">("light");
const themePreset = ref<ThemePreset>("word");
const locale = ref<LocaleCode>("zh-CN");

const { setLocale } = useI18n();

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

const sampleContent = `
<h1>欢迎使用 Yaniv Editor</h1>
<p>Yaniv Editor 是一款基于 <strong>Vue 3</strong> 与 <strong>Tiptap 3</strong> 的开箱即用富文本编辑器 UI 套件。它提供完整编辑能力、可插拔工具栏、多视觉主题与 AI 辅助写作，适合 CMS、知识库、内网文档等场景。</p>
<h2>核心特性</h2>
<ul>
  <li><strong>完整编辑</strong> — 标题、列表、表格、图片、视频、代码块、数学公式等</li>
  <li><strong>灵活集成</strong> — Full Editor 一站式接入，或 Inline 模式按需拼装工具栏</li>
  <li><strong>功能门控</strong> — 通过 version 与 features 精确控制扩展与界面显示</li>
  <li><strong>多主题</strong> — Word / Notion / GitHub / Typora，支持明暗色切换</li>
</ul>
<h2>文本与排版</h2>
<p>选中这段文字，用工具栏试试各种格式：<strong>粗体</strong>、<em>斜体</em>、<u>下划线</u>、<s>删除线</s>、<code>行内代码</code>、H<sub>2</sub>O 与 x<sup>2</sup>。还可以设置 <span style="color: #e03131">文字颜色</span>、<mark>背景高亮</mark>、<span style="font-size: 20px">字号</span>，以及段落对齐与行距。</p>
<h2>列表与块级操作</h2>
<p>无序列表：</p>
<ul>
  <li>块级拖拽 — 悬停段落左侧可移动或调整块顺序</li>
  <li>斜杠命令 — 输入 <code>/</code> 快速插入标题、列表、表格等</li>
  <li>浮动菜单 — 选中文字即可快速格式化</li>
</ul>
<p>有序步骤：</p>
<ol>
  <li>在上方切换主题预设（Word / Notion / GitHub / Typora）</li>
  <li>尝试明暗模式与语言切换</li>
  <li>浏览工具栏，体验查找替换、格式刷、Word 互转等功能</li>
</ol>
<p>任务列表：</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>浏览默认示例内容</p></li>
  <li data-type="taskItem" data-checked="false"><p>插入表格、图片或代码块</p></li>
  <li data-type="taskItem" data-checked="false"><p>配置 AI 后体验续写与润色</p></li>
</ul>
<blockquote>
  <p><strong>提示：</strong>从 Word / WPS / Excel 粘贴内容时，编辑器会自动清洗样式并保留结构。段落左侧的 <code>+</code> 按钮可快速添加新块。</p>
</blockquote>
<hr>
<h2>代码与公式</h2>
<p>内置 Lowlight 语法高亮与 KaTeX 数学公式。行内公式示例：<span data-type="math" data-latex="E=mc^2"></span>，块级公式如下：</p>
<p><span data-type="math" data-block="true" data-latex="\\int_0^1 x^2 \\, dx = \\frac{1}{3}"></span></p>
<pre><code class="language-javascript">import { YanivEditor, editorPresets } from '@yanivjs/yaniv-editor'
import '@yanivjs/yaniv-editor/style.css'

// 一行接入完整编辑器
export default { components: { YanivEditor } }</code></pre>
<h2>表格</h2>
<table>
  <tr><th>能力</th><th>说明</th><th>入口</th></tr>
  <tr><td><p>查找替换</p></td><td><p>全文搜索与批量替换</p></td><td><p>Ctrl/Cmd + F</p></td></tr>
  <tr><td><p>格式刷</p></td><td><p>复制样式后应用到其他文字</p></td><td><p>工具栏格式刷按钮</p></td></tr>
  <tr><td><p>Word 互转</p></td><td><p>导入 / 导出 .docx 文件</p></td><td><p>工具栏 Word 按钮</p></td></tr>
</table>
<h2>链接与媒体</h2>
<p style="text-align: center">工具栏支持插入 <a href="https://github.com/YanivWang/yaniv-editor">GitHub 仓库</a> 链接、图片上传、视频嵌入，以及内置文档模板与图库。</p>
<h2>AI 辅助写作</h2>
<p>在 <code>.env</code> 中配置 API Key 后，可启用 AI 续写、润色、摘要、翻译与自定义指令。选中文字后点击工具栏 AI 按钮即可体验。</p>
<p>开始编辑吧 — 删除这段示例内容，或在此基础上继续创作你的文档。</p>
`;
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
