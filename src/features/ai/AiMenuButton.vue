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
    @open-change="onDropdownOpenChange"
  />

  <AiSettingsModal v-if="showAiSettingsEntry" v-model:open="settingsModalOpen" />
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
import { computed, nextTick, onBeforeUnmount, ref } from "vue";

import { ToolbarDropdownButton } from "@/components/base";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivAiShowSettings } from "@/core/aiContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { isValidSelection } from "@/utils/prosemirrorUtils";

import AiSettingsModal from "./components/AiSettingsModal.vue";
import { LANGUAGE_CODES, currentTranslateLang, setTranslateLang } from "./translation";

import type { Editor } from "@tiptap/core";
import type { Component } from "vue";

const t = useEditorT();
const showAiSettingsEntry = useYanivAiShowSettings();
const settingsModalOpen = ref(false);
const savedSelection = ref<{ from: number; to: number } | null>(null);

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

function onDropdownOpenChange(open: boolean) {
  if (!open || !props.editor) return;

  const { from, to } = props.editor.state.selection;
  savedSelection.value = { from, to };
}

function resolveSelection(editor: Editor): { from: number; to: number } {
  const selection = savedSelection.value ?? {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };
  savedSelection.value = null;

  const docSize = editor.state.doc.content.size;
  if (!isValidSelection(selection, docSize)) {
    return {
      from: Math.max(0, Math.min(selection.from, docSize)),
      to: Math.max(0, Math.min(selection.to, docSize)),
    };
  }

  return selection;
}

/**
 * 排队中的帧句柄。
 *
 * 命令要等菜单关闭动画让出一帧再执行，而这一帧可能落在组件卸载之后：
 * `runEditorAiChain` 第一行就是 `editor.view.focus()`，销毁后访问 `editor.view`
 * 是直接抛错的（不变量 15）。外层的 try/catch 只是把它压成一条 console.error，
 * 命令并没有执行——用户点了菜单却什么也没发生。
 *
 * 留句柄同时解决第二个问题：连点两项时，前一帧会被取消，不会两条命令抢同一个选区。
 */
let pendingFrame: number | null = null;

function cancelPendingAiCommand() {
  if (pendingFrame === null) return;
  cancelAnimationFrame(pendingFrame);
  pendingFrame = null;
}

function runAiCommandAfterMenuClose(
  run: (editor: Editor, selection: { from: number; to: number }) => void,
) {
  const { editor } = props;
  if (!editor) return;

  cancelPendingAiCommand();
  nextTick(() => {
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      // 帧排队期间编辑器可能已销毁（换 session / 组件卸载）
      if (editor.isDestroyed) return;
      try {
        run(editor, resolveSelection(editor));
      } catch (error) {
        console.error("[AI Menu] Error executing command:", error);
      }
    });
  });
}

onBeforeUnmount(cancelPendingAiCommand);

function runEditorAiChain(
  editor: Editor,
  selection: { from: number; to: number },
  command: "continueWriting" | "polish" | "summarize" | "customAi" | "translate",
  targetLang?: string,
) {
  // 分开执行：AI 命令内部会直接 dispatch transaction，不能和 setTextSelection 放在同一个 chain 里
  editor.view.focus();
  editor.commands.setTextSelection(selection);

  switch (command) {
    case "continueWriting":
      editor.commands.continueWriting();
      break;
    case "polish":
      editor.commands.polish();
      break;
    case "summarize":
      editor.commands.summarize();
      break;
    case "customAi":
      editor.commands.customAi();
      break;
    case "translate":
      editor.commands.translate(targetLang);
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
    settingsModalOpen.value = true;
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

const menuItems = computed((): MenuItemConfig[] => {
  const items: MenuItemConfig[] = [
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
  ];

  if (showAiSettingsEntry.value) {
    items.push({
      key: "settings",
      label: t("aiSettings.title"),
      icon: SettingOutlined,
    });
  }

  return items;
});
</script>
