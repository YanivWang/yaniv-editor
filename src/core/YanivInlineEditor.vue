<template>
  <div :key="localeEpoch" class="yaniv-editor yaniv-inline-editor">
    <slot name="toolbar" :editor="editor" :config="toolbarConfig">
      <InlineToolbar v-if="editor && showToolbar" :editor="editor" :config="toolbarConfig" />
    </slot>
    <EditorContent v-if="editor" :editor="editor" class="yaniv-inline-editor__content" />
    <div v-else class="yaniv-inline-editor__status">{{ editorError || "正在初始化编辑器..." }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * YanivInlineEditor — lightweight inline shell with preset-driven toolbar + extensions
 */
import { Editor, EditorContent } from "@tiptap/vue-3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRef, watch } from "vue";

import { InlineToolbar } from "@/components/tools/inline-toolbar";
import { DEFAULT_INLINE_TOOLBAR } from "@/configs/inlinePresets";
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
  readonly: false,
  locale: "zh-CN",
});

const emit = defineEmits<{
  "update:content": [content: string];
}>();

const editor = shallowRef<Editor | null>(null);
provideYanivEditor(editor);

const editorError = ref<string | null>(null);
const isInitializing = ref(false);
const lastEmittedContentSignature = ref<string | null>(null);

const toolbarConfig = computed(() => props.toolbar ?? DEFAULT_INLINE_TOOLBAR);
const showToolbar = computed(() => hasInlineToolbarItems(toolbarConfig.value));
const isEditable = computed(() => !props.readonly);

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
