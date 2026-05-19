<template>
  <ToolbarDropdownButton
    :icon="icon"
    :label="label"
    :title="title"
    :active="active"
    :placement="placement"
    :items="menuItems"
    :split-hover-arrow-title="t('editor.selectLanguage')"
    @select="onMenuSelect"
    @split-primary="onSplitPrimary"
  />

  <AiSettingsModal v-model:open="showSettings" />
</template>

<script setup lang="ts">
import {
  ThunderboltOutlined,
  EditOutlined,
  FileTextOutlined,
  BulbOutlined,
  TranslationOutlined,
  SettingOutlined,
} from "@ant-design/icons-vue";
import { computed, nextTick, ref } from "vue";

import { ToolbarDropdownButton } from "@/components/base";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { t } from "@/locales";

import AiSettingsModal from "./components/AiSettingsModal.vue";
import { LANGUAGE_CODES, currentTranslateLang, setTranslateLang } from "./translation";

import type { Editor } from "@tiptap/core";
import type { Component } from "vue";

const showSettings = ref(false);

interface Props {
  editor: Editor;
  icon?: Component;
  label?: string;
  title?: string;
  active?: boolean;
  placement?: "top" | "bottom" | "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  placement: "bottom",
});

const selectedLangKey = computed(() => {
  if (!currentTranslateLang.value) return "";
  const lang = LANGUAGE_CODES.find((l) => t(`editor.lang.${l.key}`) === currentTranslateLang.value);
  return lang ? `translate-${lang.code}` : "";
});

function runAiCommandAfterMenuClose(
  run: (editor: Editor, selection: { from: number; to: number }) => void,
) {
  const { editor } = props;
  if (!editor) return;

  const selection = { from: editor.state.selection.from, to: editor.state.selection.to };

  nextTick(() => {
    requestAnimationFrame(() => {
      try {
        run(editor, selection);
      } catch (error) {
        console.error("[AI Menu] Error executing command:", error);
      }
    });
  });
}

function runEditorAiChain(
  editor: Editor,
  selection: { from: number; to: number },
  command: "continueWriting" | "polish" | "summarize" | "customAi" | "translate",
  targetLang?: string,
) {
  const chain = editor.chain().focus().setTextSelection(selection);

  switch (command) {
    case "continueWriting":
      chain.continueWriting().run();
      break;
    case "polish":
      chain.polish().run();
      break;
    case "summarize":
      chain.summarize().run();
      break;
    case "customAi":
      chain.customAi().run();
      break;
    case "translate":
      chain.translate(targetLang).run();
      break;
  }
}

function runTranslate(key: string) {
  runAiCommandAfterMenuClose((editor, selection) => {
    const lang = LANGUAGE_CODES.find((l) => `translate-${l.code}` === key);
    if (lang) {
      setTranslateLang(t(`editor.lang.${lang.key}`));
    }
    runEditorAiChain(editor, selection, "translate", currentTranslateLang.value || "英文");
  });
}

function onMenuSelect(key: string) {
  if (key === "settings") {
    showSettings.value = true;
    return;
  }

  if (key.startsWith("translate-")) {
    runTranslate(key);
    return;
  }

  const commandMap: Record<string, "continueWriting" | "polish" | "summarize" | "customAi"> = {
    continueWriting: "continueWriting",
    polish: "polish",
    summarize: "summarize",
    customAi: "customAi",
  };

  const command = commandMap[key];
  if (!command) return;

  runAiCommandAfterMenuClose((editor, selection) => {
    runEditorAiChain(editor, selection, command);
  });
}

function onSplitPrimary(itemKey: string) {
  if (itemKey !== "translate" || !currentTranslateLang.value) return;

  runAiCommandAfterMenuClose((editor, selection) => {
    runEditorAiChain(editor, selection, "translate", currentTranslateLang.value || "英文");
  });
}

const menuItems = computed((): MenuItemConfig[] => [
  {
    key: "continueWriting",
    label: t("editor.continueWriting"),
    icon: ThunderboltOutlined,
  },
  {
    key: "polish",
    label: t("editor.polish"),
    icon: EditOutlined,
  },
  {
    key: "summarize",
    label: t("editor.summarize"),
    icon: FileTextOutlined,
  },
  {
    key: "customAi",
    label: t("editor.customAi"),
    icon: BulbOutlined,
  },
  {
    key: "translate",
    label: currentTranslateLang.value
      ? t("editor.translateTo", { lang: currentTranslateLang.value })
      : t("editor.translate"),
    icon: TranslationOutlined,
    submenuMode: "split-hover",
    selectedChildKey: selectedLangKey.value,
    splitArrowTitle: t("editor.selectLanguage"),
    children: LANGUAGE_CODES.map(({ code, key }) => ({
      key: `translate-${code}`,
      label: t(`editor.lang.${key}`),
    })),
  },
  {
    key: "settings",
    label: t("aiSettings.title"),
    icon: SettingOutlined,
  },
]);
</script>
