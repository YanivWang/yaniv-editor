import { ref, watch, type Ref } from "vue";

import type { EditorShellHost } from "@/core/runtime/types";

import { ContentAdapter } from "./contentAdapter";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function computeSignature(
  content: string | JSONContent | null | undefined,
  host: EditorShellHost,
): string {
  if (!content) return "";
  if (host === "inline" && typeof content === "string") return content.trim();
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return "";
  }
}

export function normalizeInitialContent(
  content: string | JSONContent | undefined,
): string | JSONContent {
  if (!content) return EMPTY_DOC;
  if (typeof content === "string") return content;
  if (content.type === "doc") return content;
  return EMPTY_DOC;
}

export function useControlledContent(options: {
  host: EditorShellHost;
  editor: Ref<Editor | null>;
  initialContent: Ref<string | JSONContent | undefined>;
  content?: Ref<string | undefined>;
  onUpdate: (payload: JSONContent | string) => void;
  sessionReady: Ref<boolean>;
}): { lastEmittedSignature: Ref<string | null> } {
  const { host, editor, initialContent, content, onUpdate, sessionReady } = options;
  const lastEmittedSignature = ref<string | null>(null);

  watch(
    editor,
    (e, prev, onCleanup) => {
      if (!e) {
        if (prev) lastEmittedSignature.value = null;
        return;
      }
      const handler = () => {
        const payload = host === "inline" ? e.getHTML() : e.getJSON();
        lastEmittedSignature.value = computeSignature(payload, host);
        onUpdate(payload);
      };
      e.on("update", handler);
      onCleanup(() => e.off("update", handler));
    },
    { flush: "post" },
  );

  const controlledSource = content ?? initialContent;

  function applyControlledContent(next: string | JSONContent | undefined): void {
    if (!editor.value || !sessionReady.value) return;
    const incoming = computeSignature(next, host);
    if (!incoming) return;
    if (incoming === lastEmittedSignature.value) return;
    const current = computeSignature(
      host === "inline" ? editor.value.getHTML() : editor.value.getJSON(),
      host,
    );
    if (incoming === current) return;
    const normalized = normalizeInitialContent(next);
    ContentAdapter.setContent(editor.value, normalized, { source: "external" });
    lastEmittedSignature.value = incoming;
  }

  watch(controlledSource, (next) => applyControlledContent(next));

  watch(sessionReady, (ready) => {
    if (ready) applyControlledContent(controlledSource.value);
  });

  return { lastEmittedSignature };
}
