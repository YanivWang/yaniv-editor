<template>
  <ToolbarGroup>
    <ToolbarButton
      :icon="SnippetsOutlined"
      :title="t('editor.insertTemplate')"
      @click="templateModalOpen = true"
    />
  </ToolbarGroup>

  <!-- 模板选择模态框 -->
  <a-modal
    v-model:open="templateModalOpen"
    :title="t('editor.insertTemplate')"
    :footer="null"
    width="640px"
  >
    <div class="template-list">
      <div
        v-for="tpl in allTemplates"
        :key="tpl.key"
        class="template-card"
        @click="insertTemplate(tpl)"
      >
        <div class="template-card__icon">
          <FileTextOutlined />
        </div>
        <div class="template-card__body">
          <div class="template-card__name">{{ t(tpl.nameKey as any) }}</div>
          <div class="template-card__desc">{{ t(tpl.descKey as any) }}</div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * TemplateButton - 模板插入按钮
 * @description 支持从内置模板和自定义模板中选择并插入到编辑器
 */
import { SnippetsOutlined, FileTextOutlined } from "@ant-design/icons-vue";
import { computed, ref } from "vue";

import { ToolbarGroup, ToolbarButton } from "@/components/base";
import { useYanivEditor } from "@/core/editorContext";
import { t } from "@/locales";
import { createCommandRunner } from "@/utils/editorCommands";

import { builtinTemplates, normalizeTemplateHtml } from "./templates";

import type { TemplateItem } from "./templates";
import type { Editor } from "@tiptap/vue-3";

// ===== Props =====
interface Props {
  editor?: Editor | null;
  /** 自定义模板列表（可选，会追加到内置模板后面） */
  customTemplates?: TemplateItem[];
}

const props = withDefaults(defineProps<Props>(), {
  customTemplates: () => [],
});

const editor = useYanivEditor(() => props.editor);
const runCommand = createCommandRunner(editor);

// ===== 状态 =====
const templateModalOpen = ref(false);

// ===== 合并模板列表 =====
const allTemplates = computed(() => [...builtinTemplates, ...props.customTemplates]);

/**
 * 插入模板内容到编辑器
 */
function insertTemplate(tpl: TemplateItem) {
  const content = normalizeTemplateHtml(tpl.content);
  runCommand((chain) => chain.insertContent(content))();
  templateModalOpen.value = false;
}
</script>

<style scoped>
.template-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-height: 400px;
  padding: 4px;
  overflow-y: auto;
}

.template-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.2s;
}

.template-card:hover {
  background: #f0f5ff;
  border-color: var(--ye-primary);
}

[data-color-mode="dark"] .template-card {
  border-color: #434343;
}

[data-color-mode="dark"] .template-card:hover {
  background: #1a3a4d;
  border-color: #4fc3f7;
}

.template-card__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  color: var(--ye-primary);
  background: #e6f4ff;
  border-radius: 8px;
}

[data-color-mode="dark"] .template-card__icon {
  color: #4fc3f7;
  background: #1a4d6e;
}

.template-card__body {
  flex: 1;
  min-width: 0;
}

.template-card__name {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

[data-color-mode="dark"] .template-card__name {
  color: #e0e0e0;
}

.template-card__desc {
  font-size: 12px;
  line-height: 1.4;
  color: #8c8c8c;
}

[data-color-mode="dark"] .template-card__desc {
  color: #8c8c8c;
}

@media (width <= 480px) {
  .template-list {
    grid-template-columns: 1fr;
  }
}
</style>
