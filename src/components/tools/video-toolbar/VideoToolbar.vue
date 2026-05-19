<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top', offset: [0, 16] }"
    :should-show="shouldShow"
    class="video-bubble-menu"
  >
    <div class="video-menu-content">
      <div class="video-menu-group">
        <button class="video-menu-btn" title="预览" @click="previewVideo">
          <EyeOutlined />
        </button>
      </div>

      <div class="video-menu-group">
        <button class="video-menu-btn video-menu-btn--danger" title="删除视频" @click="deleteVideo">
          <DeleteOutlined />
        </button>
      </div>
    </div>

    <a-modal
      v-model:open="previewVisible"
      destroy-on-close
      :footer="null"
      :width="800"
      centered
      @cancel="closePreview"
    >
      <video
        v-if="currentVideoSrc"
        ref="previewVideoRef"
        :src="currentVideoSrc"
        controls
        style="width: 100%; height: auto"
      />
    </a-modal>
  </bubble-menu>
</template>

<script setup lang="ts">
/**
 * VideoToolbar - 视频工具栏组件
 * @description 提供视频预览、删除等功能的气泡菜单
 */
import { EyeOutlined, DeleteOutlined } from "@ant-design/icons-vue";
import { NodeSelection } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { isBlockDragging } from "@/tools/drag-handle";

import type { Editor } from "@tiptap/vue-3";

const props = withDefaults(
  defineProps<{
    editor: Editor | null | undefined;
    readonly?: boolean;
    enabled?: boolean;
  }>(),
  {
    readonly: false,
    enabled: true,
  },
);

const editor = computed(() => props.editor ?? null);
const previewVisible = ref(false);
const previewVideoRef = ref<HTMLVideoElement | null>(null);
const currentVideoSrc = ref("");

function getCurrentVideoInfo() {
  const e = editor.value;
  if (!e) return { node: null, pos: null };

  const { state } = e;
  const { selection } = state;

  if (
    selection instanceof NodeSelection &&
    selection.node &&
    selection.node.type.name === "video"
  ) {
    return { node: selection.node, pos: selection.from };
  }

  const $anchor = selection.$anchor;
  const nodeAfter = $anchor.nodeAfter;
  const nodeBefore = $anchor.nodeBefore;
  let node = null;
  let pos: number | null = null;

  if (nodeAfter?.type.name === "video") {
    node = nodeAfter;
    pos = selection.$anchor.pos;
  } else if (nodeBefore?.type.name === "video") {
    node = nodeBefore;
    pos = selection.$anchor.pos - nodeBefore.nodeSize;
  }

  return { node, pos };
}

const shouldShow = (bubbleProps: { editor: any }) => {
  if (!props.enabled || props.readonly || !bubbleProps.editor) {
    return false;
  }

  if (isBlockDragging(bubbleProps.editor)) return false;

  if (!bubbleProps.editor.isActive("video")) {
    return false;
  }

  const { node } = getCurrentVideoInfo();
  if (node?.type.name !== "video") {
    return false;
  }

  currentVideoSrc.value = node.attrs.src || "";

  return true;
};

function previewVideo() {
  const { node } = getCurrentVideoInfo();
  if (node?.type.name === "video") {
    currentVideoSrc.value = node.attrs.src || "";
    previewVisible.value = true;
  }
}

function pausePreviewVideo() {
  const video = previewVideoRef.value;
  if (!video) return;

  video.pause();
  video.currentTime = 0;
}

function closePreview() {
  pausePreviewVideo();
  previewVisible.value = false;
  currentVideoSrc.value = "";
}

function deleteVideo() {
  const e = editor.value;
  if (!e) return;

  const { node, pos } = getCurrentVideoInfo();
  if (!node || pos === null) return;

  closePreview();
  e.chain().focus().setNodeSelection(pos).deleteSelection().run();
}

watch(previewVisible, (open) => {
  if (!open) {
    pausePreviewVideo();
    currentVideoSrc.value = "";
  }
});

onBeforeUnmount(() => {
  closePreview();
});
</script>

<style scoped>
.video-bubble-menu {
  z-index: 1001;
}

.video-menu-content {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  [data-theme="dark"] & {
    background: #1f1f1f;
    border-color: #434343;
  }
}

.video-menu-group {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 4px;
  border-right: 1px solid #e8e8e8;

  [data-theme="dark"] & {
    border-right-color: #434343;
  }
}

.video-menu-group:last-child {
  border-right: none;
}

.video-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #333;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;

  [data-theme="dark"] & {
    color: #f0f0f0;
  }
}

.video-menu-btn:hover:not(:disabled) {
  background: #f5f5f5;

  [data-theme="dark"] & {
    background: #303030;
  }
}

.video-menu-btn--danger {
  color: #ff4d4f;

  [data-theme="dark"] & {
    color: #ff7875;
  }
}

.video-menu-btn--danger:hover {
  color: #ff4d4f;
  background: #fff1f0;

  [data-theme="dark"] & {
    color: #ff7875;
    background: #3a1a1a;
  }
}
</style>
