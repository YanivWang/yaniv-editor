import { defineComponent, h } from "vue";

/** 文字颜色图标：仅显示 A，底部色条由 ColorPicker 动态渲染 */
export const TextColorIcon = defineComponent({
  name: "TextColorIcon",
  render() {
    return h("span", { class: "color-icon color-icon--text" }, "A");
  },
});
