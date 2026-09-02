/**
 * LineHeight Extension - 行间距扩展
 *
 * **行高是段落级属性，挂在 `paragraph` / `heading` 节点上，不是 textStyle mark 的属性。**
 * 这一点与 `@tiptap/extension-text-style` 里同名的官方 `LineHeight` 不同——后者把它做成
 * mark 属性。本仓库注册的是单独的 `TextStyle`（不含官方 LineHeight），因此没有冲突；
 * 但那个包的**全局命令类型声明**仍会生效，`setLineHeight` 的类型来自它。
 * 读这个属性时要按本实现的位置走 `getAttributes("paragraph" | "heading")`，
 * 而不是 `getAttributes("textStyle")`——格式刷曾按官方语义去读 textStyle，
 * 结果恒为 undefined，整段复制行高的逻辑是死的。
 */

import { Extension } from "@tiptap/core";

export interface LineHeightOptions {
  types: string[];
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            /**
             * 默认必须是 `null`，不能填具体值。
             *
             * 填了值等于给**每一个**段落和标题都强加 `style="line-height: …"`：
             * 一来内联样式会盖掉 appearance 的 `--ye-line-height`
             * （default 外观要 1.7，实测被压成 1.5）；
             * 二来 `getJSON()` 里每个节点都多出一个宿主从未设过的属性，
             * 解析外部 HTML 时也会给本来没有行高的段落硬塞一个。
             */
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return this.options.types.some((type) => commands.updateAttributes(type, { lineHeight }));
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.some((type) =>
            commands.updateAttributes(type, { lineHeight: null }),
          );
        },
    };
  },
});
