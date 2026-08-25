<template>
  <Modal
    v-model:open="visible"
    :title="t('editor.findReplaceTitle')"
    :footer="null"
    destroy-on-close
    width="480px"
    :wrap-class-name="modalWrapClass"
    :get-container="getOverlayContainer"
    @cancel="onClose"
    @after-open-change="onAfterOpenChange"
  >
    <div class="find-replace-form">
      <Space direction="vertical" style="width: 100%">
        <Input
          v-model:value="term"
          :placeholder="t('editor.findPlaceholder')"
          allow-clear
          @press-enter="handleFindNext"
        />
        <Input
          v-model:value="replaceWith"
          :placeholder="t('editor.replacePlaceholder')"
          allow-clear
        />
        <Checkbox v-model:checked="caseSens">{{ t("editor.findReplaceMatchCase") }}</Checkbox>
      </Space>
      <div class="find-replace-form__actions">
        <Button type="primary" size="small" @click="handleFindPrev">{{
          t("editor.findPrev")
        }}</Button>
        <Button type="primary" size="small" @click="handleFindNext">{{
          t("editor.findNext")
        }}</Button>
        <Button size="small" @click="handleReplace">{{ t("editor.replaceOnce") }}</Button>
        <Button danger size="small" @click="handleReplaceAll">{{ t("editor.replaceAll") }}</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
/**
 * FindReplaceDialog — 查找 / 替换面板（依赖 SearchReplace 扩展）
 *
 * 挂载条件只看 `gates.searchReplace`，与顶栏是否显示无关；
 * Ctrl/Cmd+F 快捷键也在这里注册，因此隐藏顶栏的 preset 同样可用。
 * 打开入口通过 `useFindReplacePanel()` 共享，顶栏按钮只负责调用 `open()`。
 */
import { computed, ref, watch } from "vue";

import { useInjectEditorAppearance } from "@/appearance";
import { useFindReplaceHotkey } from "@/composables/useFindReplaceHotkey";
import { useOverlayMountTarget } from "@/composables/useOverlayMount";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Modal, Input, Button, Checkbox, Space } from "@/shared/antd";

import { useFindReplacePanel } from "./useFindReplacePanel";

const t = useEditorT();
const getOverlayContainer = useOverlayMountTarget();
const appearanceCtx = useInjectEditorAppearance();
const modalWrapClass = computed(() => {
  const classes = ["yaniv-editor-modal"];
  if (appearanceCtx?.appearance.value === "notion") classes.push("yaniv-find-replace-modal");
  return classes.join(" ");
});

const editor = useYanivEditor();
const { visible, open, close } = useFindReplacePanel();

const term = ref("");
const replaceWith = ref("");
const caseSens = ref(false);

function syncStorageToVue() {
  const e = editor.value;
  if (!e) return;
  const raw = e.storage as unknown as {
    searchReplace?: { searchTerm: string; replaceTerm: string; caseSensitive: boolean };
  };
  if (!raw.searchReplace) return;
  const s = raw.searchReplace;
  term.value = s.searchTerm;
  replaceWith.value = s.replaceTerm;
  caseSens.value = s.caseSensitive;
}

watch(term, (v) => {
  const e = editor.value;
  if (!e?.commands?.setSearchReplaceTerm) return;
  e.commands.setSearchReplaceTerm(v);
  e.commands.resetSearchReplaceIndex();
});

watch(replaceWith, (v) => {
  const e = editor.value;
  if (!e?.commands?.setSearchReplaceReplaceTerm) return;
  e.commands.setSearchReplaceReplaceTerm(v);
});

watch(caseSens, (v) => {
  const e = editor.value;
  if (!e?.commands?.setSearchReplaceCaseSensitive) return;
  e.commands.setSearchReplaceCaseSensitive(v);
  e.commands.resetSearchReplaceIndex();
});

watch(visible, (opened) => {
  if (opened) syncStorageToVue();
});

useFindReplaceHotkey({
  enabled: () => true,
  onOpen: () => {
    syncStorageToVue();
    open();
  },
});

function onClose() {
  const e = editor.value;
  if (e) e.commands.setSearchReplaceTerm("");
  close();
}

function onAfterOpenChange(opened: boolean) {
  if (opened) syncStorageToVue();
}

/** 替换后文档变化，需重新选中当前索引对应命中（扩展内已含视口滚动） */
function revealHit() {
  editor.value?.commands.searchReplaceSelectCurrent();
}

function handleFindNext() {
  editor.value?.commands.searchReplaceFindNext();
}

function handleFindPrev() {
  editor.value?.commands.searchReplaceFindPrevious();
}

function handleReplace() {
  const e = editor.value;
  if (!e) return;
  e.commands.searchReplaceReplaceCurrent();
  revealHit();
}

function handleReplaceAll() {
  editor.value?.commands.searchReplaceReplaceAll();
  revealHit();
}
</script>

<style scoped lang="scss">
.find-replace-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
