import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/vue-3";
import { computed, onBeforeUnmount } from "vue";

import { FontSize } from "../../../src/extensions/fontSize";
import { t } from "../../../src/locales";

export function useInlineEditor() {
  const editor = useEditor({
    content: t("demo.inline.sampleContent"),
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start typing..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    editorProps: {
      attributes: { class: "inline-prose" },
    },
  });

  const characterCount = computed(() => editor.value?.storage.characterCount?.characters() ?? 0);
  const wordCount = computed(() => editor.value?.storage.characterCount?.words() ?? 0);

  const statsText = computed(() =>
    t("demo.inline.stats", {
      characters: String(characterCount.value),
      words: String(wordCount.value),
    }),
  );

  onBeforeUnmount(() => {
    editor.value?.destroy();
  });

  return { editor, statsText };
}
