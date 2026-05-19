<template>
  <ToolbarGroup>
    <ToolbarDropdownButton
      :icon="CodeOutlined"
      :title="t('toolbar.insertCodeBlock')"
      :active="isCodeOrBlockActive"
      :items="menuItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>
</template>

<script setup lang="ts">
/**
 * CodeBlockDropdown - 代码块与语言选择（含行内代码、退出代码块）
 */
import { CodeOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

import { ToolbarGroup, ToolbarDropdownButton } from "@/components/base";
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
const isInlineCodeActive = computed(() => isActive("code"));
const isCodeOrBlockActive = computed(() => isCodeBlockActive.value || isInlineCodeActive.value);

const currentLanguage = computed(() => {
  const lang = editor.value?.getAttributes("codeBlock")?.language;
  return typeof lang === "string" && lang ? lang : DEFAULT_CODE_BLOCK_LANGUAGE;
});

const menuItems = computed<MenuItemConfig[]>(() => {
  if (!editor.value) return [];

  const items: MenuItemConfig[] = [];

  if (isCodeBlockActive.value) {
    items.push({
      key: "exit-code-block",
      label: t("codeBlock.exitCodeBlock"),
      action: () => runCommand((chain) => chain.setParagraph())(),
    });
  } else {
    items.push({
      key: "inline-code",
      label: t("editor.inlineCode"),
      active: isInlineCodeActive.value,
      action: () => runCommand((chain) => chain.toggleCode())(),
    });
  }

  items.push({ key: "divider-languages", type: "divider" });

  for (const lang of CODE_LANGUAGES) {
    items.push({
      key: lang,
      label: lang,
      active: isCodeBlockActive.value && currentLanguage.value === lang,
      action: () => onLanguageSelect(lang),
    });
  }

  return items;
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
