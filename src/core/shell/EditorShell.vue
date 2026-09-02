<template>
  <div ref="rootRef" :class="rootSurfaceClass" :data-phase="profile.mode">
    <!-- portal 须先于 chrome 挂载，供 BubbleMenu appendTo 在子组件 setup 时可用 -->
    <div ref="overlayPortalRef" :class="OVERLAY_PORTAL_CLASS" />

    <div v-show="sessionStatus !== 'loading'" class="yaniv-editor__chrome">
      <!-- `editor` 必须参与判定：让 chrome 带着 editor===null 再渲染一帧，
           搬进 portal 的浮层会在已被摘走的容器上抛 insertBefore（不变量 45） -->
      <template v-if="isFull && fullChrome?.showEditChrome && editor">
        <EditorEditChrome
          :key="sessionKey"
          :chrome="fullChrome!"
          :upload-image="fullProps?.uploadImage"
          :upload-video="fullProps?.uploadVideo"
          :gallery-images="fullProps?.galleryImages"
          :custom-templates="fullProps?.customTemplates"
        />
      </template>

      <slot
        v-if="!isFull && inlineChrome?.showInlineToolbar"
        name="toolbar"
        :editor="editor"
        :config="toolbarConfig"
      />

      <EditorWorkspace
        v-if="isFull && fullChrome"
        :key="sessionKey"
        ref="workspaceRef"
        :chrome="fullChrome"
        :zoom-level="zoomLevel"
      />

      <div v-else-if="!isFull" class="yaniv-inline-editor__body">
        <EditorContent v-if="editor" :editor="editor" class="yaniv-inline-editor__content" />
      </div>

      <EditorStatusChrome
        v-if="isFull && fullChrome?.showFooter"
        :chrome="fullChrome!"
        :total-pages="totalPages"
        :zoom-level="zoomLevel"
        @update:zoom-level="zoomLevel = $event"
      />
    </div>

    <div v-if="sessionStatus === 'loading'" class="yaniv-editor__skeleton">
      {{ localeContext.t("editor.sessionLoading") }}
    </div>
    <div v-if="sessionStatus === 'error'" class="yaniv-editor__error">
      {{ sessionError }}
      <button type="button" @click="retrySession">
        {{ localeContext.t("editor.sessionRetry") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";

import { getAppearanceClassName, useEditorAppearance } from "@/appearance";
import { provideFindReplacePanel } from "@/components/editor/find-replace";
import { provideOutlinePanel } from "@/components/editor/outline";
import type { YanivInlineEditorProps } from "@/configs/inlineTypes";
import { provideEditorRoot, provideOverlayPortal, provideYanivEditor } from "@/core/editorContext";
import type { YanivEditorProps, YanivEditorExpose } from "@/core/editorTypes";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { OVERLAY_PORTAL_CLASS, resolveOverlayPortal } from "@/core/overlayPortal";
import type { EditorShellHost, FullChromePolicy, InlineChromePolicy } from "@/core/runtime/types";
import { useEditorRuntime } from "@/core/runtime/useEditorRuntime";
import { useControlledContent } from "@/core/session/useControlledContent";
import { useEditorSession } from "@/core/session/useEditorSession";
import { useEditorPagination } from "@/core/useEditorPagination";
import { useYanivAiConfig } from "@/core/useYanivAiConfig";
import { Modal } from "@/shared/antd";
import { YE_Z_BASE_VAR, YE_Z_INDEX_DEFAULT_BASE } from "@/utils/zIndex";

import EditorEditChrome from "./EditorEditChrome.vue";
import EditorStatusChrome from "./EditorStatusChrome.vue";
import EditorWorkspace from "./EditorWorkspace.vue";
import { provideBlockMenuHost } from "./useBlockMenuHost";

import type { EditorWorkspaceExpose } from "./exposeTypes";
import type { JSONContent } from "@tiptap/core";

const props = defineProps<{
  host: EditorShellHost;
  fullProps?: YanivEditorProps;
  inlineProps?: YanivInlineEditorProps;
}>();

const emit = defineEmits<{
  update: [content: JSONContent];
  "update:content": [content: string];
}>();

const isFull = computed(() => props.host === "full");
const fullProps = computed(() => props.fullProps);
const inlineProps = computed(() => props.inlineProps);

const rootRef = ref<HTMLElement | null>(null);
const overlayPortalRef = ref<HTMLElement | null>(null);
const workspaceRef = ref<EditorWorkspaceExpose | null>(null);

provideEditorRoot(rootRef);
provideOverlayPortal(overlayPortalRef);

const zIndexBase = computed(
  () =>
    (isFull.value ? fullProps.value?.zIndexBase : inlineProps.value?.zIndexBase) ??
    YE_Z_INDEX_DEFAULT_BASE,
);

watch(
  [rootRef, zIndexBase],
  () => {
    const el = rootRef.value;
    if (!el) return;
    el.style.setProperty(YE_Z_BASE_VAR, String(zIndexBase.value));
  },
  { immediate: true },
);

const localeSource = computed(() =>
  isFull.value ? fullProps.value?.locale : inlineProps.value?.locale,
);

// 语言包只有 `provideEditorLocale` 这一个加载方：此前这里另起一个 watch 再加载一次，
// 两份状态既重复请求、又会各自竞态到不同的结果（locale 与 messages 对不上）。
const localeContext = provideEditorLocale(localeSource);

useEditorAppearance({
  rootRef,
  appearance: computed(() => fullProps.value?.appearance ?? "default"),
  colorMode: computed(() =>
    isFull.value
      ? (fullProps.value?.colorMode ?? "light")
      : (inlineProps.value?.colorMode ?? "light"),
  ),
  customAppearanceVars: computed(() => fullProps.value?.customAppearanceVars),
});

useYanivAiConfig(fullProps);

provideOutlinePanel(fullProps.value?.defaultOutlineExpanded ?? false);
provideFindReplacePanel();
const blockMenuHost = provideBlockMenuHost();

const runtime = isFull.value
  ? useEditorRuntime({
      host: "full",
      props: computed(() => fullProps.value ?? {}),
      locale: localeContext.locale,
    })
  : useEditorRuntime({
      host: "inline",
      mode: computed(() => inlineProps.value?.mode ?? "edit"),
      toolbar: computed(() => inlineProps.value?.toolbar),
      locale: localeContext.locale,
      inlinePlaceholder: computed(() => inlineProps.value?.placeholder),
      extraExtensions: computed(() => inlineProps.value?.extraExtensions),
    });

const { profile, chrome, sessionKey, toolbarConfig } = runtime;

const fullChrome = computed((): FullChromePolicy | null =>
  chrome.value.host === "full" ? chrome.value : null,
);

const inlineChrome = computed((): InlineChromePolicy | null =>
  chrome.value.host === "inline" ? chrome.value : null,
);

const appearanceClass = computed(() =>
  getAppearanceClassName(fullProps.value?.appearance ?? "default"),
);

const rootSurfaceClass = computed(() => [
  "yaniv-editor",
  isFull.value ? "document-layout" : "yaniv-inline-editor",
  appearanceClass.value,
]);

const workspaceContainerRef = computed(
  () => workspaceRef.value?.containerRef ?? null,
) as Ref<HTMLElement | null>;

const { totalPages, zoomLevel, calculatePages } = useEditorPagination(workspaceContainerRef);

let outlineScrollEl: HTMLElement | null = null;

const {
  editor,
  status: sessionStatus,
  sessionError,
  onPhaseChange,
  retrySession,
} = useEditorSession({
  host: props.host,
  profile,
  sessionKey,
  locale: localeContext.messages,
  blockMenuHost,
  editorProps: inlineProps.value?.editorProps,
  buildCtx: () => ({
    upload: {
      image: () => fullProps.value?.uploadImage,
      video: () => fullProps.value?.uploadVideo,
    },
    galleryImages: () => fullProps.value?.galleryImages ?? [],
    mentionItems: () => fullProps.value?.mentionItems,
    officePaste: {
      onPasteFromOfficeWithImages: () => () =>
        Modal.info({
          title: localeContext.t("editor.officePasteImageTitle"),
          content: localeContext.t("editor.officePasteImageBody"),
          getContainer: () => {
            if (overlayPortalRef.value) return overlayPortalRef.value;
            if (rootRef.value) return resolveOverlayPortal(rootRef.value);
            throw new Error("Overlay portal is not mounted");
          },
          wrapClassName: "yaniv-editor-modal",
        }),
    },
    outline: {
      scrollParent: () => outlineScrollEl,
      bindScrollParent: (el) => {
        outlineScrollEl = el;
      },
    },
    aiConfig: () => fullProps.value?.aiConfig,
    inlinePlaceholder: inlineProps.value?.placeholder,
    extraExtensions: inlineProps.value?.extraExtensions,
  }),
  onReady: (e) => {
    if (!isFull.value) return;
    calculatePages();
    e.on("update", () => calculatePages());
  },
});

provideYanivEditor(editor);

const sessionReady = computed(() => sessionStatus.value === "ready");

useControlledContent({
  host: props.host,
  editor,
  initialContent: computed(() =>
    isFull.value ? fullProps.value?.initialContent : inlineProps.value?.content,
  ),
  content: isFull.value ? undefined : computed(() => inlineProps.value?.content),
  sessionReady,
  onUpdate: (payload) => {
    if (isFull.value) {
      emit("update", payload as JSONContent);
    } else {
      emit("update:content", payload as string);
    }
  },
});

const offPhaseChange = onPhaseChange(({ to, reason }) => {
  if (reason === "ready") return;
  if (to === "preview") blockMenuHost.hide();
});

onBeforeUnmount(() => {
  offPhaseChange();
});

defineExpose({
  getEditor: () => editor.value,
  getJSON: () => editor.value?.getJSON() ?? null,
  getHTML: () => editor.value?.getHTML() ?? "",
  getText: () => editor.value?.getText() ?? "",
} satisfies YanivEditorExpose);
</script>
