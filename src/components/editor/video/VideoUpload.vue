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
import { computed, ref } from "vue";

import { ToolbarButton, ToolbarGroup } from "@/components/base";
import { t } from "@/locales";
import { createCommandRunner } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/vue-3";

interface Props {
  editor: Editor | null | undefined;
  /** 视频上传函数（可选） */
  uploadVideo?: (file: File) => Promise<string>;
}

const props = withDefaults(defineProps<Props>(), {
  uploadVideo: undefined,
});

const editor = computed(() => props.editor ?? null);
const runCommand = createCommandRunner(editor);

const videoUploadOpen = ref(false);

/**
 * 处理本地视频上传（自定义上传逻辑）
 * - 若父组件提供 uploadVideo(file) 回调则使用其返回的 URL
 * - 否则回退为本地 DataURL 直接插入
 */
async function handleVideoUpload(options: any) {
  const { file, onSuccess, onError } = options || {};
  try {
    let url: string;
    if (props.uploadVideo) {
      url = await props.uploadVideo(file as File);
    } else {
      // 使用 Base64 编码
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read video as data URL"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file as File);
      });
    }
    // 插入视频
    runCommand((chain) => chain.insertContent({ type: "video", attrs: { src: url } }))();
    videoUploadOpen.value = false;
    onSuccess?.({ url });
  } catch (e) {
    onError?.(e);
  }
}
</script>
