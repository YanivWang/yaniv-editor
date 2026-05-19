<template>
  <ToolbarGroup>
    <ToolbarDropdownButton
      :icon="CodeOutlined"
      :title="t('toolbar.insertCodeBlock')"
      :active="isCodeBlockActive"
      :items="languageItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * CodeBlockDropdown - 代码块与语言选择
 */
import { CodeOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarGroup, ToolbarDropdownButton } from "@/base";
import { CODE_LANGUAGES, DEFAULT_CODE_BLOCK_LANGUAGE } from "@/configs/editorConstants";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { t } from "@/locales";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";

import { insertDefaultCodeBlock, updateCodeBlockLanguage } from "./codeBlockUtils";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor | null | undefined;
}

const props = defineProps<Props>();
const editor = computed(() => props.editor ?? null);

const runCommand = createCommandRunner(editor);
const { isActive } = createStateCheckers(editor);

const isCodeBlockActive = computed(() => isActive("codeBlock"));

const currentLanguage = computed(() => {
  const lang = editor.value?.getAttributes("codeBlock")?.language;
  return typeof lang === "string" && lang ? lang : DEFAULT_CODE_BLOCK_LANGUAGE;
});

const languageItems = computed<MenuItemConfig[]>(() => {
  if (!editor.value) return [];

  return CODE_LANGUAGES.map((lang) => ({
    key: lang,
    label: lang,
    active: isCodeBlockActive.value && currentLanguage.value === lang,
    action: () => onLanguageSelect(lang),
  }));
});

function onLanguageSelect(language: string) {
  const e = editor.value;
  if (!e) return;

  if (isCodeBlockActive.value) {
    updateCodeBlockLanguage(e, language);
    return;
  }

  insertCodeBlock(language);
}

function insertCodeBlock(language: string) {
  const e = editor.value;
  if (!e) return;

  const { from, to, empty } = e.state.selection;

  if (empty) {
    if (language === DEFAULT_CODE_BLOCK_LANGUAGE) {
      insertDefaultCodeBlock(e);
    } else {
      runCommand((chain) => chain.setCodeBlock({ language }))();
    }
    return;
  }

  const selectedText = e.state.doc.textBetween(from, to, "\n");

  e.chain()
    .focus()
    .deleteSelection()
    .insertContent({
      type: "codeBlock",
      attrs: { language },
      content: selectedText ? [{ type: "text", text: selectedText }] : undefined,
    })
    .run();
}
</script>
