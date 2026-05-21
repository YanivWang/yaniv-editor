<template>
  <div ref="rootRef" :key="localeEpoch" class="yaniv-editor yaniv-inline-editor">
    <slot v-if="!isPreviewMode" name="toolbar" :editor="editor" :config="toolbarConfig">
      <InlineToolbar v-if="editor && showToolbar" :editor="editor" :config="toolbarConfig" />
    </slot>
    <EditorContent v-if="editor" :editor="editor" class="yaniv-inline-editor__content" />
    <div v-else class="yaniv-inline-editor__status">{{ editorError || "正在初始化编辑器..." }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * YanivInlineEditor — lightweight inline shell with a default toolbar and custom toolbar config
 */
import { Editor, EditorContent } from "@tiptap/vue-3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRef, watch } from "vue";

import { resolveColorMode, watchSystemColorMode } from "@/appearance/applyAppearance";
import { InlineToolbar } from "@/components/tools/inline-toolbar";
import { DEFAULT_INLINE_TOOLBAR } from "@/configs/inlineToolbar";
import type { YanivInlineEditorProps } from "@/configs/inlineTypes";
import { provideYanivEditor } from "@/core/editorContext";
import { useEditorLocale } from "@/core/useEditorLocale";
import {
  buildInlineExtensions,
  hasInlineToolbarItems,
  resolveInlineExtensionGates,
} from "@/extensions/inlineExtensions";

const props = withDefaults(defineProps<YanivInlineEditorProps>(), {
  content: "<p></p>",
  mode: "edit",
  locale: "zh-CN",
  colorMode: "light",
});

const emit = defineEmits<{
  "update:content": [content: string];
}>();

const editor = shallowRef<Editor | null>(null);
provideYanivEditor(editor);

const rootRef = ref<HTMLElement | null>(null);

function applyColorMode() {
  if (!rootRef.value) return;
  const resolved = resolveColorMode(props.colorMode);
  rootRef.value.setAttribute("data-color-mode", resolved);
}

watch(() => props.colorMode, applyColorMode, { immediate: true });

let cleanupSystemWatch: (() => void) | undefined;
watch(
  () => props.colorMode,
  (mode) => {
    cleanupSystemWatch?.();
    if (mode === "auto") {
      cleanupSystemWatch = watchSystemColorMode(() => applyColorMode());
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  cleanupSystemWatch?.();
});

const editorError = ref<string | null>(null);
const isInitializing = ref(false);
const lastEmittedContentSignature = ref<string | null>(null);

const toolbarConfig = computed(() => props.toolbar ?? DEFAULT_INLINE_TOOLBAR);
const showToolbar = computed(() => hasInlineToolbarItems(toolbarConfig.value));
const isPreviewMode = computed(() => props.mode === "preview");
const isEditable = computed(() => props.mode === "edit");

const { localeEpoch, whenLocaleReady } = useEditorLocale(toRef(props, "locale"));

function mergeEditorProps(userProps?: Record<string, unknown>) {
  const userAttrs = (userProps?.attributes as Record<string, string> | undefined) ?? {};
  const mergedClass = [userAttrs.class, "inline-prose"].filter(Boolean).join(" ");

  return {
    ...userProps,
    attributes: {
      ...userAttrs,
      class: mergedClass,
    },
  };
}

const initEditor = async () => {
  if (isInitializing.value) return;

  try {
    isInitializing.value = true;
    editorError.value = null;
    await whenLocaleReady();

    // Inline 的扩展集合跟 toolbar 强绑定：隐藏某类按钮时也不注册对应扩展。
    const gates = resolveInlineExtensionGates({ toolbar: toolbarConfig.value });
    const extensions = buildInlineExtensions({
      gates,
      placeholder: props.placeholder,
      extraExtensions: props.extraExtensions,
    });

    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
    }

    await nextTick();

    editor.value = new Editor({
      editable: isEditable.value,
      extensions,
      content: props.content,
      editorProps: mergeEditorProps(props.editorProps),
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        lastEmittedContentSignature.value = html;
        emit("update:content", html);
      },
    });

    lastEmittedContentSignature.value = editor.value.getHTML();
  } catch (error) {
    console.error("[YanivInlineEditor] Editor initialization failed:", error);
    editorError.value = "编辑器初始化失败";
  } finally {
    isInitializing.value = false;
  }
};

const destroyEditor = () => {
  editor.value?.destroy();
  editor.value = null;
};

onMounted(async () => {
  await initEditor();
});

onBeforeUnmount(() => {
  destroyEditor();
});

watch(isEditable, (editable) => {
  editor.value?.setEditable(editable);
});

watch(
  () => props.content,
  (content) => {
    const ed = editor.value;
    if (!ed || isInitializing.value) return;
    if (!content || content === lastEmittedContentSignature.value) return;
    if (content === ed.getHTML()) return;

    // 外部受控内容变化才同步进编辑器；组件自身 emit 的 HTML 会被上面的签名挡掉。
    ed.commands.setContent(content, { emitUpdate: false });
    lastEmittedContentSignature.value = content;
  },
);

defineExpose({
  getEditor: () => editor.value,
  getJSON: () => editor.value?.getJSON() ?? null,
  getHTML: () => editor.value?.getHTML() ?? "",
  getText: () => editor.value?.getText() ?? "",
});
</script>
