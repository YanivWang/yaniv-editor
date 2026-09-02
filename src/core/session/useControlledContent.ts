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
  /** 最近一次处理过的受控源签名；换编辑器实例不重置——它记的是「源」而非编辑器状态 */
  let lastAppliedSource: string | null = null;

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
    // 走到这里就算「这份源已处理」——无论下面是真灌进去、还是发现内容已经一致
    lastAppliedSource = incoming;
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

  /**
   * session 重建后要不要重灌受控源，取决于**这份源自己变没变**，不是第几次就绪。
   *
   * 这个 watch 有两个职责：首次把内容灌进新建的编辑器，以及兜住重建期间错过的
   * 源变更（重建时 `sessionReady` 为 false，`watch(controlledSource)` 会早退）。
   * 但 full 的 `initialContent` 不是 v-model（它 emit `update` 让宿主自己存），
   * 源没变却重灌，就会把 `useEditorSession` 刚从快照恢复出来的用户内容整份盖掉
   * ——切换语言时必然踩到。inline 的 `content` 是真受控，宿主是权威，照灌不误。
   *
   * 判据写成「这份源已经灌过了吗」才两头都对：切 locale（源没变）跳过，
   * 宿主改 `initialContent`（源变了，如 demo 里跟着 preset 走的示例内容）照常应用。
   */
  const isControlled = content !== undefined;

  watch(sessionReady, (ready) => {
    if (!ready) return;
    if (!isControlled) {
      const incoming = computeSignature(controlledSource.value, host);
      if (incoming && incoming === lastAppliedSource) return;
    }
    applyControlledContent(controlledSource.value);
  });

  return { lastEmittedSignature };
}
