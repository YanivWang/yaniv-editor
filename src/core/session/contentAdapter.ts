import { DOMParser } from "@tiptap/pm/model";

import { BYPASS_GUARD_META } from "@/capabilities/transactionGuard";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

export interface SetContentOptions {
  addToHistory?: boolean;
  source?: "external" | "phase" | "session-rebuild";
}

const EMPTY_DOC_HTML = "<p></p>";

function htmlToElement(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

export const ContentAdapter = {
  setContent(editor: Editor, content: JSONContent | string, options: SetContentOptions = {}): void {
    const view = editor.view;

    let doc;
    try {
      doc =
        typeof content === "string"
          ? DOMParser.fromSchema(view.state.schema).parse(htmlToElement(content))
          : view.state.schema.nodeFromJSON(content);
    } catch {
      console.warn("[ContentAdapter] Failed to parse content, using empty doc");
      doc = view.state.schema.nodes.doc.create(null, [view.state.schema.nodes.paragraph.create()]);
    }

    const tr = view.state.tr
      .setMeta(BYPASS_GUARD_META as unknown as string, true)
      .setMeta("addToHistory", options.addToHistory ?? false)
      .setMeta("yaniv:source", options.source ?? "external")
      .replaceWith(0, view.state.doc.content.size, doc.content);

    view.dispatch(tr);
  },

  setHtml(editor: Editor, html: string, options?: SetContentOptions): void {
    ContentAdapter.setContent(editor, html || EMPTY_DOC_HTML, options);
  },
};
