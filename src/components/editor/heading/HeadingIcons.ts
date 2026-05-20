import { defineComponent, h } from "vue";

import type { HeadingValue } from "@/configs/toolbarTypes";

/** 正文图标：T */
export const ParagraphIcon = defineComponent({
  name: "ParagraphIcon",
  render() {
    return h("span", { class: "heading-icon heading-icon--paragraph" }, "T");
  },
});

function createHeadingIcon(level: number) {
  return defineComponent({
    name: `Heading${level}Icon`,
    render() {
      return h("span", { class: "heading-icon heading-icon--heading" }, [
        h("span", { class: "heading-icon__h" }, "H"),
        h("sub", { class: "heading-icon__level" }, String(level)),
      ]);
    },
  });
}

/** 工具栏触发按钮图标：Tt */
export const HeadingTriggerIcon = defineComponent({
  name: "HeadingTriggerIcon",
  render() {
    return h("span", { class: "heading-trigger-icon" }, [
      h("span", { class: "heading-trigger-icon__large" }, "T"),
      h("span", { class: "heading-trigger-icon__small" }, "t"),
    ]);
  },
});

/** 下拉项图标映射 */
export const HEADING_ITEM_ICONS: Record<HeadingValue, ReturnType<typeof defineComponent>> = {
  paragraph: ParagraphIcon,
  h1: createHeadingIcon(1),
  h2: createHeadingIcon(2),
  h3: createHeadingIcon(3),
  h4: createHeadingIcon(4),
  h5: createHeadingIcon(5),
  h6: createHeadingIcon(6),
};
