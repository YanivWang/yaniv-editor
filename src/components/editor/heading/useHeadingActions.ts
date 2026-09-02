import { toValue, type MaybeRefOrGetter } from "vue";

import { HEADING_OPTIONS } from "@/configs/editorConstants";
import type { HeadingLevel } from "@/configs/toolbarTypes";
import { createStateCheckers } from "@/utils/editorState";

import type { Editor } from "@tiptap/core";

export function useHeadingActions(editor: MaybeRefOrGetter<Editor | null>) {
  const { isHeadingActive } = createStateCheckers(editor);

  function setHeadingValue(val: string): void {
    const e = toValue(editor);
    if (!e) return;

    const { from, to } = e.state.selection;

    if (val === "paragraph") {
      e.chain().setParagraph().setTextSelection({ from, to }).run();
      return;
    }

    const level = Number(val.replace(/^h/, "")) as HeadingLevel;
    if (![1, 2, 3, 4, 5, 6].includes(level)) return;

    const $from = e.state.selection.$from;
    const start = $from.start($from.depth);
    const end = $from.end($from.depth);

    let chain = e.chain().setHeading({ level });

    if (e.schema.marks.textStyle) {
      chain = chain.setTextSelection({ from: start, to: end }).unsetMark("textStyle");
    }

    chain.setTextSelection({ from, to }).run();
  }

  /**
   * 按钮组入口：已是该级别就切回段落，否则设为该级别。
   *
   * 内部走 {@link setHeadingValue}，与下拉入口**完全同一条路径**。
   * 此前这里是 `chain.toggleHeading({ level })`，少了那边的「清掉 textStyle」一步：
   * 同一个「设为 H2」，按钮做出来是 `<h2><span style="font-size: 28px">…</span></h2>`
   * ——残留字号盖过标题自己的字号（实测），下拉做出来才是干净的 `<h2>`。
   */
  function toggleHeadingLevel(level: HeadingLevel) {
    return () => {
      if (isHeadingActive(level)) {
        setHeadingValue("paragraph");
        return;
      }
      setHeadingValue(`h${level}`);
    };
  }

  return {
    headingOptions: HEADING_OPTIONS,
    isHeadingActive,
    setHeadingValue,
    toggleHeadingLevel,
  };
}
