<template>
  <div class="demo-page demo-page--full yaniv-editor-host">
    <!-- 集成方可通过 :ai-config 注入（默认隐藏「AI 设置」、不写 localStorage），例如：
    <YanivEditor
      v-bind="editorPresets.production"
      :ai-config="{ provider: 'openai', apiKey: '...', model: 'gpt-4o-mini' }"
    />
    -->
    <YanivEditor
      v-bind="editorPresets.production"
      locale="zh-CN"
      theme-preset="default"
      theme-mode="light"
      :initial-content="sampleContent"
    />
  </div>
</template>

<script setup lang="ts">
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

const sampleContent = `
<h1>Yaniv Editor</h1>
<p>基于 Vue 3 + Tiptap 3 的富文本编辑器。本页演示 <strong>完整接入</strong>：引入组件与样式即可使用。</p>
<h2>试试工具栏</h2>
<p>选中文字，使用<strong>粗体</strong>、<em>斜体</em>、标题、列表、表格等功能。</p>
`;
</script>

<style scoped>
/* 撑满导航下方区域；min-height: 0 允许 flex 子项收缩并在内部滚动 */
.demo-page--full {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.demo-page--full :deep(.yaniv-editor) {
  flex: 1;
  min-height: 0;
}
</style>
