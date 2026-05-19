<template>
  <a-dropdown
    v-model:open="dropdownOpen"
    :placement="placement"
    :trigger="['click']"
    @open-change="handleOpenChange"
  >
    <a-tooltip :title="title" placement="top" :open="dropdownOpen ? false : undefined">
      <a-button type="text" :class="['ai-menu-button', { 'is-active': active }]">
        <span class="ai-menu-button__content">
          <component :is="icon" v-if="icon" class="ai-menu-button__icon" />
          <span v-if="label" class="ai-menu-button__label">{{ label }}</span>
          <DownOutlined class="ai-menu-button__arrow" />
        </span>
      </a-button>
    </a-tooltip>

    <template #overlay>
      <a-menu style="max-height: 360px; overflow-y: auto" @click="onMenuClick">
        <template v-for="item in menuItems" :key="item.key">
          <!-- 带子菜单的菜单项（如总结内容） -->
          <a-menu-item
            v-if="item.children && item.children.length > 0"
            :key="item.key + ':with-children'"
          >
            <div class="ai-menu-translate-split" @mouseenter="onRowEnter" @mouseleave="onRowLeave">
              <span class="ai-menu-translate-split__main" @click.stop="onTranslateDefault()">
                <component :is="item.icon" v-if="item.icon" class="ai-menu-item__icon" />
                <span class="ai-menu-item__label">{{ item.label }}</span>
              </span>
              <a-dropdown
                :trigger="hasSelectedLang ? ['hover'] : []"
                placement="rightTop"
                :open="overlayOpen"
                @open-change="onDropOpenChange"
              >
                <span class="ai-menu-translate-split__arrow" :title="t('editor.selectLanguage')">
                  <RightOutlined />
                </span>
                <template #overlay>
                  <div
                    class="ai-menu-translate-overlay"
                    @mouseenter="onOverlayEnter"
                    @mouseleave="onOverlayLeave"
                  >
                    <a-menu
                      class="ai-menu-dropdown-overlay"
                      :selected-keys="selectedLangKey ? [selectedLangKey] : []"
                      @click="onTranslateLangClick"
                    >
                      <a-menu-item
                        v-for="child in item.children"
                        :key="child.key"
                        :disabled="(child as any).disabled"
                        :danger="(child as any).danger"
                      >
                        <span class="ai-menu-item">
                          <span class="ai-menu-item__label">{{ child.label }}</span>
                        </span>
                      </a-menu-item>
                    </a-menu>
                  </div>
                </template>
              </a-dropdown>
            </div>
          </a-menu-item>

          <!-- 普通菜单项 -->
          <a-menu-item
            v-else
            :key="item.key"
            :disabled="(item as any).disabled"
            :danger="(item as any).danger"
          >
            <span class="ai-menu-item">
              <component :is="item.icon" v-if="item.icon" class="ai-menu-item__icon" />
              <span class="ai-menu-item__label">{{ item.label }}</span>
            </span>
          </a-menu-item>
        </template>
      </a-menu>
    </template>
  </a-dropdown>

  <AiSettingsModal v-model:open="showSettings" />
</template>

<script setup lang="ts">
import {
  DownOutlined,
  RightOutlined,
  ThunderboltOutlined,
  EditOutlined,
  FileTextOutlined,
  BulbOutlined,
  TranslationOutlined,
  SettingOutlined,
} from "@ant-design/icons-vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { ref, computed, nextTick } from "vue";

import { t } from "@/locales";

import AiSettingsModal from "./components/AiSettingsModal.vue";
import { LANGUAGE_CODES, currentTranslateLang, setTranslateLang } from "./translation";

import type { Editor } from "@tiptap/core";
import type { Component } from "vue";

// 菜单项配置类型
export interface MenuItemConfig {
  key: string;
  label: string;
  icon?: Component;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children?: MenuItemConfig[];
}

// 下拉菜单打开状态（用于控制 Tooltip 显示）
const dropdownOpen = ref(false);
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

// 子菜单状态管理（用于翻译功能的语言选择）
const overlayOpen = ref(false);
const hasSelectedLang = computed(() => !!currentTranslateLang.value);
const selectedLangKey = computed(() => {
  if (!currentTranslateLang.value) return "";
  // 根据当前语言标签找到对应的 key
  const lang = LANGUAGE_CODES.find((l) => t(`editor.lang.${l.key}`) === currentTranslateLang.value);
  return lang ? `translate-${lang.code}` : "";
});

let closeTimeout: number | null = null;

function cancelClose() {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
}

function scheduleClose() {
  cancelClose();
  closeTimeout = window.setTimeout(() => {
    overlayOpen.value = false;
  }, 150);
}

function onRowEnter() {
  if (!hasSelectedLang.value) {
    cancelClose();
    overlayOpen.value = true;
  }
}

function onRowLeave() {
  if (!hasSelectedLang.value) {
    scheduleClose();
  }
}

function onOverlayEnter() {
  cancelClose();
}

function onOverlayLeave() {
  scheduleClose();
}

function onDropOpenChange(nextOpen: boolean) {
  if (hasSelectedLang.value) {
    overlayOpen.value = nextOpen;
  }
}

// 使用翻译模块的 setTranslateLang 函数

function findItemByKey(items: MenuItemConfig[], key: string): MenuItemConfig | undefined {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children?.length) {
      const found = findItemByKey(item.children, key);
      if (found) return found;
    }
  }
  return undefined;
}

/** 菜单关闭后恢复选区并在同一 chain 中执行命令，避免 mismatched transaction */
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
      (chain as any).continueWriting().run();
      break;
    case "polish":
      (chain as any).polish().run();
      break;
    case "summarize":
      (chain as any).summarize().run();
      break;
    case "customAi":
      (chain as any).customAi().run();
      break;
    case "translate":
      (chain as any).translate(targetLang).run();
      break;
  }
}

function onMenuClick(info: { key: string }) {
  if (info.key === "settings") {
    showSettings.value = true;
    return;
  }

  if (info.key.startsWith("translate-")) {
    const child = findItemByKey(menuItems.value, info.key);
    if (!child) return;
    runAiCommandAfterMenuClose((editor, selection) => {
      const lang = LANGUAGE_CODES.find((l) => `translate-${l.code}` === info.key);
      if (lang) {
        setTranslateLang(t(`editor.lang.${lang.key}`));
      }
      runEditorAiChain(editor, selection, "translate", currentTranslateLang.value || "英文");
    });
    return;
  }

  const commandMap: Record<string, "continueWriting" | "polish" | "summarize" | "customAi"> = {
    continueWriting: "continueWriting",
    polish: "polish",
    summarize: "summarize",
    customAi: "customAi",
  };

  const command = commandMap[info.key];
  if (!command) return;

  runAiCommandAfterMenuClose((editor, selection) => {
    runEditorAiChain(editor, selection, command);
  });
}

function onTranslateDefault() {
  if (!hasSelectedLang.value) {
    overlayOpen.value = true;
    return;
  }

  runAiCommandAfterMenuClose((editor, selection) => {
    runEditorAiChain(editor, selection, "translate", currentTranslateLang.value || "英文");
  });
}

function onTranslateLangClick(info: { key: string }) {
  const child = findItemByKey(menuItems.value, info.key);
  if (!child) return;

  runAiCommandAfterMenuClose((editor, selection) => {
    const lang = LANGUAGE_CODES.find((l) => `translate-${l.code}` === info.key);
    if (lang) {
      setTranslateLang(t(`editor.lang.${lang.key}`));
    }
    runEditorAiChain(editor, selection, "translate", currentTranslateLang.value || "英文");
  });
}

function handleOpenChange(open: boolean) {
  if (!open) {
    overlayOpen.value = false;
  }
}

// 构建菜单项
const menuItems = computed(() => {
  const { editor } = props;

  return [
    {
      key: "continueWriting",
      label: t("editor.continueWriting"),
      icon: ThunderboltOutlined,
      action: () => {
        if (!editor) return;

        try {
          // 验证编辑器状态
          const { state } = editor;
          const { selection, doc } = state;
          const docSize = doc.content.size;

          // 验证 selection 是否有效
          if (
            selection.from < 0 ||
            selection.to < 0 ||
            selection.from > docSize ||
            selection.to > docSize ||
            selection.from > selection.to
          ) {
            console.warn("[AI Menu] Invalid selection, cannot execute continueWriting");
            return;
          }

          // 使用 chain 确保命令在同一个事务中执行
          if (typeof (editor.commands as any).continueWriting === "function") {
            const result = editor.chain().focus().continueWriting().run();
            if (!result) {
              console.warn("[AI Menu] continueWriting command returned false");
            }
          } else {
            console.warn("[AI Menu] continueWriting command not available");
            editor.commands.focus();
          }
        } catch (error) {
          console.error("[AI Menu] Error executing continueWriting:", error);
        }
      },
      disabled: false,
      danger: false,
    },
    {
      key: "polish",
      label: t("editor.polish"),
      icon: EditOutlined,
      action: () => {
        if (!editor) return;

        try {
          // 验证编辑器状态
          const { state } = editor;
          const { selection, doc } = state;
          const docSize = doc.content.size;

          // 验证 selection 是否有效
          if (
            selection.from < 0 ||
            selection.to < 0 ||
            selection.from > docSize ||
            selection.to > docSize ||
            selection.from > selection.to
          ) {
            console.warn("[AI Menu] Invalid selection, cannot execute polish");
            return;
          }

          // 使用 chain 确保命令在同一个事务中执行
          if (typeof (editor.commands as any).polish === "function") {
            const result = editor.chain().focus().polish().run();
            if (!result) {
              console.warn("[AI Menu] polish command returned false");
            }
          } else {
            console.warn("[AI Menu] polish command not available");
            editor.commands.focus();
          }
        } catch (error) {
          console.error("[AI Menu] Error executing polish:", error);
        }
      },
      disabled: false,
      danger: false,
    },
    {
      key: "summarize",
      label: t("editor.summarize"),
      icon: FileTextOutlined,
      action: () => {
        if (!editor) return;

        try {
          // 验证编辑器状态
          const { state } = editor;
          const { selection, doc } = state;
          const docSize = doc.content.size;

          // 验证 selection 是否有效
          if (
            selection.from < 0 ||
            selection.to < 0 ||
            selection.from > docSize ||
            selection.to > docSize ||
            selection.from > selection.to
          ) {
            console.warn("[AI Menu] Invalid selection, cannot execute summarize");
            return;
          }

          // 使用 chain 确保命令在同一个事务中执行
          if (typeof (editor.commands as any).summarize === "function") {
            const result = editor.chain().focus().summarize().run();
            if (!result) {
              console.warn("[AI Menu] summarize command returned false");
            }
          } else {
            console.warn("[AI Menu] summarize command not available");
            editor.commands.focus();
          }
        } catch (error) {
          console.error("[AI Menu] Error executing summarize:", error);
        }
      },
      disabled: false,
      danger: false,
    },
    {
      key: "customAi",
      label: t("editor.customAi"),
      icon: BulbOutlined,
      action: () => {
        if (!editor) return;

        try {
          // 验证编辑器状态
          const { state } = editor;
          const { selection, doc } = state;
          const docSize = doc.content.size;

          // 验证 selection 是否有效
          if (
            selection.from < 0 ||
            selection.to < 0 ||
            selection.from > docSize ||
            selection.to > docSize ||
            selection.from > selection.to
          ) {
            console.warn("[AI Menu] Invalid selection, cannot execute customAi");
            return;
          }

          // 使用 chain 确保命令在同一个事务中执行
          if (typeof (editor.commands as any).customAi === "function") {
            const result = editor.chain().focus().customAi().run();
            if (!result) {
              console.warn("[AI Menu] customAi command returned false");
            }
          } else {
            console.warn("[AI Menu] customAi command not available");
            editor.commands.focus();
          }
        } catch (error) {
          console.error("[AI Menu] Error executing customAi:", error);
        }
      },
      disabled: false,
      danger: false,
    },
    {
      key: "translate",
      label: currentTranslateLang.value
        ? t("editor.translateTo", { lang: currentTranslateLang.value })
        : t("editor.translate"),
      icon: TranslationOutlined,
      action: () => {
        if (!editor) return;

        try {
          // 验证编辑器状态
          const { state } = editor;
          const { selection, doc } = state;
          const docSize = doc.content.size;

          // 验证 selection 是否有效
          if (
            selection.from < 0 ||
            selection.to < 0 ||
            selection.from > docSize ||
            selection.to > docSize ||
            selection.from > selection.to
          ) {
            console.warn("[AI Menu] Invalid selection, cannot execute translate");
            return;
          }

          // 使用保存的语言或默认语言
          const targetLang = currentTranslateLang.value || "英文";

          // 使用 chain 确保命令在同一个事务中执行
          if (typeof (editor.commands as any).translate === "function") {
            const result = editor.chain().focus().translate(targetLang).run();
            if (!result) {
              console.warn("[AI Menu] translate command returned false");
            }
          } else {
            console.warn("[AI Menu] translate command not available");
            editor.commands.focus();
          }
        } catch (error) {
          console.error("[AI Menu] Error executing translate:", error);
        }
      },
      disabled: false,
      danger: false,
      children: LANGUAGE_CODES.map(({ code, key }) => {
        const langLabel = t(`editor.lang.${key}`);
        return {
          key: `translate-${code}`,
          label: langLabel,
          action: () => {
            if (!editor) return;

            // 设置并保存语言选择
            setTranslateLang(langLabel);

            try {
              // 验证编辑器状态
              const { state } = editor;
              const { selection, doc } = state;
              const docSize = doc.content.size;

              // 验证 selection 是否有效
              if (
                selection.from < 0 ||
                selection.to < 0 ||
                selection.from > docSize ||
                selection.to > docSize ||
                selection.from > selection.to
              ) {
                console.warn("[AI Menu] Invalid selection, cannot execute translate");
                return;
              }

              // 使用 chain 确保命令在同一个事务中执行
              if (typeof (editor.commands as any).translate === "function") {
                const result = editor.chain().focus().translate(langLabel).run();
                if (!result) {
                  console.warn("[AI Menu] translate command returned false");
                }
              } else {
                console.warn("[AI Menu] translate command not available");
                editor.commands.focus();
              }
            } catch (error) {
              console.error("[AI Menu] Error executing translate:", error);
            }
          },
          disabled: false,
          danger: false,
        };
      }),
    },
    {
      key: "settings",
      label: t("aiSettings.title"),
      icon: SettingOutlined,
      action: () => {
        showSettings.value = true;
      },
      disabled: false,
      danger: false,
    },
  ] as MenuItemConfig[];
});
</script>

<style scoped>
@media (width <= 768px) {
  .ai-menu-button {
    height: 28px;
    padding: 0 6px;
  }
  .ai-menu-button__icon {
    font-size: 14px;
  }
  .ai-menu-button__label {
    font-size: 12px;
  }
}

.ai-menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  line-height: 1;
  color: #262626;
  border-radius: 4px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    color: #f0f0f0;
  }
}

.ai-menu-button:hover {
  color: #262626;
  background: #f5f5f5;

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    color: #f0f0f0;
    background: #303030;
  }
}

.ai-menu-button.is-active {
  color: #1890ff;
  background: #e6f4ff;

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    color: #4fc3f7;
    background: #1a4d6e;
  }
}

.ai-menu-button :deep(.ant-btn-icon) {
  display: none;
}

.ai-menu-button__content {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.ai-menu-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;
}

.ai-menu-button__icon :deep(.anticon) {
  font-size: 18px;
}

.ai-menu-button__label {
  font-size: 14px;
  line-height: 1;
}

.ai-menu-button__arrow {
  display: flex;
  align-items: center;
  margin-left: -2px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.65;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.ai-menu-button:hover .ai-menu-button__arrow {
  opacity: 1;
}

.ai-menu-dropdown-overlay {
  max-height: 260px !important;
  overflow-y: auto !important;
}

@media (width <= 768px) {
  .ai-menu-dropdown-overlay {
    max-height: 150px !important;
  }
}

.ai-menu-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 120px;
  font-size: 14px;
}

.ai-menu-item__icon {
  font-size: 16px;
  color: rgb(0 0 0 / 65%);

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    color: rgb(255 255 255 / 65%);
  }
}

.ai-menu-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-menu-dropdown-overlay :deep(.ant-dropdown-menu-item) {
  padding: 8px 10px;
}

.ai-menu-dropdown-overlay :deep(.ant-dropdown-menu-item-selected) {
  color: #1677ff !important;
  background: #e6f4ff !important;

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    color: #4fc3f7 !important;
    background: #1a4d6e !important;
  }
}

.ai-menu-translate-split {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.ai-menu-translate-split__main {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  cursor: pointer;
}

.ai-menu-translate-split__arrow {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.ai-menu-translate-split__arrow:hover {
  background-color: rgba(0, 0, 0, 0.06);

  :where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *) & {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

@media (width <= 768px) {
  .ai-menu-translate-split {
    gap: 2px;
  }

  .ai-menu-translate-split__main {
    gap: 6px;
  }

  .ai-menu-translate-split__arrow {
    width: 20px;
    height: 20px;
    margin-left: 2px;
  }
}
</style>
