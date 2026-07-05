<template>
  <ToolbarGroup>
    <ToolbarButton
      :icon="VideoCameraOutlined"
      :title="t('editor.uploadVideo')"
      @click="videoUploadOpen = true"
    />
  </ToolbarGroup>

  <!-- 本地上传视频（拖拽上传，支持批量） -->
  <a-modal v-model:open="videoUploadOpen" :title="t('editor.localUploadVideo')" :footer="null">
    <a-upload-dragger
      :show-upload-list="false"
      :custom-request="handleVideoUpload"
      accept="video/*"
      multiple
    >
      <p class="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p class="ant-upload-text">{{ t("editor.clickOrDragUpload") }}</p>
      <p class="ant-upload-hint">{{ t("editor.onlySupportVideo") }}</p>
    </a-upload-dragger>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * VideoUpload - 视频上传组件
 * @description 支持本地上传视频
 */
import { InboxOutlined, VideoCameraOutlined } from "@ant-design/icons-vue";
import { ref } from "vue";


import { ToolbarButton, ToolbarGroup } from "@/components/base";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { Modal as AModal, UploadDragger as AUploadDragger } from "@/shared/antd";
import { createCommandRunner } from "@/utils/editorCommands";
import { resolveMediaUrl } from "@/utils/mediaUpload";

import type { Editor } from "@tiptap/vue-3";

const t = useEditorT();

interface Props {
  editor?: Editor | null;
  /** 视频上传函数（可选） */
  uploadVideo?: (file: File) => Promise<string>;
}

const props = withDefaults(defineProps<Props>(), {
  uploadVideo: undefined,
});

const editor = useYanivEditor(() => props.editor);
const runCommand = createCommandRunner(editor);

const videoUploadOpen = ref(false);

/**
 * 处理本地视频上传（自定义上传逻辑）
 * - 视频必须由 uploadVideo(file) 上传并返回 URL，避免把大文件写入文档内容
 */
async function handleVideoUpload(options: any) {
  const { file, onSuccess, onError } = options || {};
  try {
    const url = await resolveMediaUrl({
      file: file as File,
      kind: "video",
      upload: props.uploadVideo,
      translate: t,
    });
    // 插入视频
    runCommand((chain) => chain.insertContent({ type: "video", attrs: { src: url } }))();
    videoUploadOpen.value = false;
    onSuccess?.({ url });
  } catch (e) {
    onError?.(e);
  }
}
</script>
