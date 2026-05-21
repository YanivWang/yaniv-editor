<template>
  <div
    ref="rootRef"
    class="yaniv-editor yaniv-inline-editor demo-inline"
    :data-phase="profile.mode"
  >
    <div v-show="sessionStatus !== 'loading'">
      <div v-if="editor && inlineChrome?.showInlineToolbar" class="demo-inline__toolbar">
        <UndoRedoButton :editor="editor" />
        <HeadingControl variant="dropdown" :editor="editor" />
        <TextFormatButtons :editor="editor" />
        <ListTools :editor="editor" :show-task-list="true" />
        <AlignDropdown v-if="toolbar.align" :editor="editor" />
        <LinkButton v-if="toolbar.link" :editor="editor" />
        <ClearFormatButton v-if="toolbar.clearFormat" :editor="editor" />
        <CodeBlockDropdown v-if="toolbar.codeBlock" :editor="editor" />
      </div>
      <EditorContent v-if="editor" :editor="editor" class="demo-inline__content" />
    </div>
    <div v-if="sessionStatus === 'loading'" class="demo-inline__skeleton">正在加载编辑器…</div>
    <div v-if="sessionStatus === 'error'" class="demo-inline__error">
      {{ sessionError }}
      <button type="button" @click="retrySession">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import { useEditorAppearance } from "@/appearance";
import { provideEditorLocale, resolveLocaleMessages } from "@/core/infra/useEditorLocale";
import { useEditorRuntime } from "@/core/runtime/useEditorRuntime";
import { useControlledContent } from "@/core/session/useControlledContent";
import { useEditorSession } from "@/core/session/useEditorSession";
import { provideBlockMenuHost } from "@/core/shell/useBlockMenuHost";
import type { TiptapLocale } from "@/locales/types";

import {
  AlignDropdown,
  ClearFormatButton,
  CodeBlockDropdown,
  HeadingControl,
  LinkButton,
  ListTools,
  TextFormatButtons,
  UndoRedoButton,
  type InlineToolbarConfig,
} from "@yanivjs/yaniv-editor/inline";

import type { EditorColorMode, EditorMode } from "@yanivjs/yaniv-editor";

const props = defineProps<{
  toolbar: InlineToolbarConfig;
  mode: EditorMode;
  colorMode?: EditorColorMode;
}>();

const content = defineModel<string>("content", { required: true });

const rootRef = ref<HTMLElement | null>(null);
const localeCode = ref<"zh-CN" | "en-US">("zh-CN");
const localeMessages = shallowRef<TiptapLocale | null>(null);

provideEditorLocale(computed(() => localeCode.value));

watch(
  localeCode,
  async (code) => {
    localeMessages.value = await resolveLocaleMessages(code);
  },
  { immediate: true },
);

useEditorAppearance({
  rootRef,
  appearance: ref("default"),
  colorMode: computed(() => props.colorMode ?? "light"),
});

const blockMenuHost = provideBlockMenuHost();

const { profile, chrome, sessionKey } = useEditorRuntime({
  host: "inline",
  mode: computed(() => props.mode),
  toolbar: computed(() => props.toolbar),
  locale: localeCode,
});

const inlineChrome = computed(() => (chrome.value.host === "inline" ? chrome.value : null));

const {
  editor,
  status: sessionStatus,
  sessionError,
  onPhaseChange,
  retrySession,
} = useEditorSession({
  host: "inline",
  profile,
  sessionKey,
  locale: computed(() => localeMessages.value!),
  blockMenuHost,
  editorProps: { attributes: { class: "inline-prose" } },
  buildCtx: () => ({
    upload: { image: () => undefined, video: () => undefined },
    galleryImages: () => [],
    officePaste: { onPasteFromOfficeWithImages: () => undefined },
    outline: { scrollParent: () => null, bindScrollParent: () => {} },
    aiConfig: () => undefined,
    inlinePlaceholder: "写点什么…",
  }),
});

const sessionReady = computed(() => sessionStatus.value === "ready");

useControlledContent({
  host: "inline",
  editor,
  initialContent: content,
  content,
  sessionReady,
  onUpdate: (payload) => {
    content.value = payload as string;
  },
});

const offPhaseChange = onPhaseChange(({ to, reason }) => {
  if (reason === "ready") return;
  if (to === "preview") blockMenuHost.hide();
});

onBeforeUnmount(() => {
  offPhaseChange();
});
</script>

<style scoped>
.demo-inline {
  width: 100%;
  max-width: 720px;
  overflow: hidden;
  background: var(--ye-bg);
  border: 1px solid var(--ye-border);
  border-radius: var(--ye-radius-lg);
}

.demo-inline__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: var(--ye-toolbar-bg);
  border-bottom: 1px solid var(--ye-border);
}

.demo-inline__content {
  min-height: 160px;
  padding: 12px 16px;
}

.demo-inline__skeleton {
  padding: 24px 16px;
  font-size: 13px;
  color: var(--ye-text-muted, #64748b);
  text-align: center;
}

.demo-inline__error {
  padding: 16px;
  font-size: 13px;
  color: #b91c1c;
  text-align: center;
}

.demo-inline__error button {
  margin-left: 8px;
}
</style>
