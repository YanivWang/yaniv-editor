<template>
  <ToolbarGroup>
    <ToolbarDropdownButton
      :icon="FileWordOutlined"
      :title="t('editor.word')"
      :items="menuItems"
      placement="bottomLeft"
    />
  </ToolbarGroup>

  <!-- 导入 Word 文件（拖拽上传） -->
  <a-modal
    v-model:open="importModalOpen"
    :title="t('editor.importWord')"
    :footer="null"
    :get-container="getOverlayContainer"
    wrap-class-name="yaniv-editor-modal"
  >
    <a-upload-dragger
      :show-upload-list="false"
      :custom-request="handleImport"
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      :disabled="importing"
    >
      <p class="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p class="ant-upload-text">{{ t("editor.clickOrDragUploadWord") }}</p>
      <p class="ant-upload-hint">{{ t("editor.onlySupportDocx") }}</p>
    </a-upload-dragger>
    <div v-if="importing" style="margin-top: 12px; color: #999; text-align: center">
      {{ t("editor.importing") }}
    </div>
  </a-modal>

  <!-- 覆盖确认：导入会替换整个文档，当前内容全部丢失 -->
  <a-modal
    v-model:open="replaceConfirmOpen"
    :title="t('editor.importWordReplaceTitle')"
    :ok-text="t('editor.importWordReplaceConfirm')"
    :cancel-text="t('editor.cancel')"
    :ok-button-props="{ danger: true }"
    :get-container="getOverlayContainer"
    wrap-class-name="yaniv-editor-modal"
    @ok="confirmReplaceImport"
    @cancel="cancelReplaceImport"
  >
    {{ t("editor.importWordReplaceHint") }}
  </a-modal>

  <!-- 导出文件名输入框 -->
  <a-modal
    v-model:open="exportModalOpen"
    :title="t('editor.exportWord')"
    :ok-button-props="{ disabled: exporting }"
    :get-container="getOverlayContainer"
    wrap-class-name="yaniv-editor-modal"
    @ok="doExport"
  >
    <a-input
      v-model:value="exportFilename"
      :placeholder="t('editor.exportFilenamePlaceholder')"
      :disabled="exporting"
      @keyup.enter="doExport"
    />
    <div v-if="exporting" style="margin-top: 12px; color: #999; text-align: center">
      {{ t("editor.exporting") }}
    </div>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * WordButton - Word 导入/导出按钮组件
 * @description 支持 .docx 文件的导入和导出
 */
import {
  FileWordOutlined,
  ImportOutlined,
  ExportOutlined,
  InboxOutlined,
} from "@ant-design/icons-vue";
import { computed, ref } from "vue";

import { ToolbarGroup, ToolbarDropdownButton } from "@/components/base";
import { useOverlayFeedback } from "@/composables/useOverlayFeedback";
import { useOverlayMountTarget } from "@/composables/useOverlayMount";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Input as AInput, Modal as AModal, UploadDragger as AUploadDragger } from "@/shared/antd";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();
const getOverlayContainer = useOverlayMountTarget();
const feedback = useOverlayFeedback();

// ===== Props =====
interface Props {
  editor?: Editor | null;
}

const props = defineProps<Props>();
const editor = useYanivEditor(() => props.editor);

// ===== 状态 =====
const importModalOpen = ref(false);
const exportModalOpen = ref(false);
const exportFilename = ref("document");
const importing = ref(false);
const exporting = ref(false);

// ===== 覆盖确认 =====
/**
 * 导入用 `setContent` **替换整个文档**，当前内容全部丢失且无法撤销回上一份文稿。
 * 文档非空时先确认——空文档没什么可覆盖的，直接导入，不打断用户。
 */
const replaceConfirmOpen = ref(false);
type PendingImport = {
  file: File;
  onSuccess?: (body: unknown) => void;
  onError?: (error: unknown) => void;
};
let pendingImport: PendingImport | null = null;

/** `props.editor` 是 @tiptap/vue-3 的 Editor，而 useYanivEditor 交出的是 core 的（同 FormatPainterButton） */
type BoundEditor = NonNullable<typeof editor.value>;

function documentHasContent(e: BoundEditor): boolean {
  return e.getText().trim().length > 0 || e.state.doc.content.size > 4;
}

function confirmReplaceImport() {
  replaceConfirmOpen.value = false;
  const pending = pendingImport;
  pendingImport = null;
  if (pending) void runImport(pending);
}

function cancelReplaceImport() {
  replaceConfirmOpen.value = false;
  const pending = pendingImport;
  pendingImport = null;
  // 让 antd 的上传项落到「失败」而不是永远转圈
  pending?.onError?.(new Error("import cancelled"));
}

// ===== 菜单项 =====
const menuItems = computed<MenuItemConfig[]>(() => [
  {
    key: "import-word",
    label: t("editor.importWord"),
    icon: ImportOutlined,
    action: () => {
      importModalOpen.value = true;
    },
  },
  {
    key: "export-word",
    label: t("editor.exportWord"),
    icon: ExportOutlined,
    action: () => {
      exportFilename.value = "document";
      exportModalOpen.value = true;
    },
  },
]);

/** 真正执行导入（已确认或无需确认） */
async function runImport(pending: PendingImport) {
  const e = editor.value;
  if (!e) return;

  importing.value = true;
  try {
    const { importWordFile } = await import("./wordImport");
    await importWordFile(e, pending.file);
    importModalOpen.value = false;
    feedback.toast(t("messages.wordImportSuccess"), "success");
    pending.onSuccess?.({});
  } catch (err) {
    console.error("[WordButton] Import failed:", err);
    feedback.toast(t("messages.wordImportFailed"), "error");
    pending.onError?.(err);
  } finally {
    importing.value = false;
  }
}

/**
 * 处理 Word 文件导入。
 *
 * 文档非空时先弹确认：导入是 `setContent`，会把当前内容整份换掉。
 */
async function handleImport(options: any) {
  const { file, onSuccess, onError } = options || {};
  const e = editor.value;
  if (!e) return;

  const pending: PendingImport = { file: file as File, onSuccess, onError };
  if (documentHasContent(e)) {
    pendingImport = pending;
    replaceConfirmOpen.value = true;
    return;
  }
  await runImport(pending);
}

/**
 * 执行 Word 导出
 */
async function doExport() {
  const e = editor.value;
  if (!e) return;

  exporting.value = true;
  try {
    const { exportToWord } = await import("./wordExport");
    const html = e.getHTML();
    const name = exportFilename.value.trim() || "document";
    await exportToWord(html, name);
    exportModalOpen.value = false;
    feedback.toast(t("messages.wordExportSuccess"), "success");
  } catch (err) {
    console.error("[WordButton] Export failed:", err);
    feedback.toast(t("messages.wordExportFailed"), "error");
  } finally {
    exporting.value = false;
  }
}
</script>
