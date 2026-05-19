<template>
  <ToolbarButton :icon="SearchOutlined" :title="t('editor.findReplace')" @click="openModal" />
  <Modal
    v-model:open="visible"
    :title="t('editor.findReplaceTitle')"
    :footer="null"
    destroy-on-close
    width="480px"
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
        <Checkbox v-model:checked="caseSens">{{ t("editor.caseSensitiveShort") }}</Checkbox>
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
 * FindReplaceButton — 查找 / 替换（依赖 SearchReplace 扩展）
 */
import { SearchOutlined } from "@ant-design/icons-vue";
import { Modal, Input, Button, Checkbox, Space } from "ant-design-vue";
import { computed, ref, watch } from "vue";

import { ToolbarButton } from "@/components/base";
import { useFindReplaceHotkey } from "@/composables/useFindReplaceHotkey";
import { t } from "@/locales";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor | null | undefined;
  /** Ctrl/Cmd+F 是否打开面板 */
  hotkeysEnabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hotkeysEnabled: true,
});

const editor = computed(() => props.editor ?? null);

const visible = ref(false);
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

function openModal() {
  syncStorageToVue();
  visible.value = true;
}

useFindReplaceHotkey({
  enabled: () => props.hotkeysEnabled,
  onOpen: openModal,
});

function onClose() {
  const e = editor.value;
  if (e) e.commands.setSearchReplaceTerm("");
  visible.value = false;
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
