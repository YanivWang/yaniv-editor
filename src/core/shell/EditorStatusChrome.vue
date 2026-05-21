<template>
  <FooterNav
    v-if="editor"
    v-model:zoom-level="zoomLevelModel"
    :total-pages="totalPages"
    :show-char-count="true"
    :show-shortcut-hints="chrome.showStatusHints"
    :zoom-bar-placement="presetLayout.zoomPlacement"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

import { FooterNav } from "@/components/tools/footer-nav";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorRuntimeContext } from "@/core/runtime/editorRuntimeContext";
import type { FullChromePolicy } from "@/core/runtime/types";

const props = defineProps<{
  chrome: FullChromePolicy;
  totalPages: number;
  zoomLevel: number;
}>();

const emit = defineEmits<{
  "update:zoomLevel": [value: number];
}>();

const zoomLevelModel = computed({
  get: () => props.zoomLevel,
  set: (v: number) => emit("update:zoomLevel", v),
});

const editor = useYanivEditor();
const { presetLayout } = useEditorRuntimeContext();
</script>
