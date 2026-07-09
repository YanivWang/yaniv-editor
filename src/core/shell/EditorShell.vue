<template>
  <div ref="rootRef" :class="rootSurfaceClass" :data-phase="profile.mode">
    <div v-show="sessionStatus !== 'loading'" class="yaniv-editor__chrome">
      <template v-if="isFull && fullChrome?.showEditChrome">
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

    <div v-if="sessionStatus === 'loading'" class="yaniv-editor__skeleton">正在加载编辑器...</div>
    <div v-if="sessionStatus === 'error'" class="yaniv-editor__error">
      {{ sessionError }}
      <button type="button" @click="retrySession">重试</button>
    </div>

    <div ref="overlayPortalRef" :class="OVERLAY_PORTAL_CLASS" />
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { Modal } from "ant-design-vue";
import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";

import { getAppearanceClassName, useEditorAppearance } from "@/appearance";
import { provideOutlinePanel } from "@/components/editor/outline";
import type { YanivInlineEditorProps } from "@/configs/inlineTypes";
import { provideEditorRoot, provideOverlayPortal, provideYanivEditor } from "@/core/editorContext";
import type { YanivEditorProps, YanivEditorExpose } from "@/core/editorTypes";
import { provideEditorLocale, resolveLocaleMessages } from "@/core/infra/useEditorLocale";
import { OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import type { EditorShellHost, FullChromePolicy, InlineChromePolicy } from "@/core/runtime/types";
import { useEditorRuntime } from "@/core/runtime/useEditorRuntime";
import { useControlledContent } from "@/core/session/useControlledContent";
import { useEditorSession } from "@/core/session/useEditorSession";
import { useEditorPagination } from "@/core/useEditorPagination";
import { useYanivAiConfig } from "@/core/useYanivAiConfig";
import type { TiptapLocale } from "@/locales/types";
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
const localeMessages = shallowRef<TiptapLocale | null>(null);

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

const localeContext = provideEditorLocale(localeSource);

watch(
  () => localeContext.locale.value,
  async (code) => {
    localeMessages.value = await resolveLocaleMessages(code);
  },
  { immediate: true },
);

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

const { totalPages, zoomLevel, calculatePages, initPageCssVariables } =
  useEditorPagination(workspaceContainerRef);

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
  locale: computed(() => localeMessages.value!),
  blockMenuHost,
  editorProps: inlineProps.value?.editorProps,
  buildCtx: () => ({
    upload: {
      image: () => fullProps.value?.uploadImage,
      video: () => fullProps.value?.uploadVideo,
    },
    galleryImages: () => fullProps.value?.galleryImages ?? [],
    officePaste: {
      onPasteFromOfficeWithImages: () => () =>
        Modal.info({
          title: localeContext.t("editor.officePasteImageTitle"),
          content: localeContext.t("editor.officePasteImageBody"),
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
    initPageCssVariables();
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
