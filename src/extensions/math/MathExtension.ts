/**
 * Math Extension
 * @description Tiptap 数学公式扩展，支持 LaTeX 语法和 KaTeX 渲染
 */

import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

import MathNodeView from "./MathNodeView.vue";
import { DEFAULT_KATEX_OPTIONS } from "./types";

import type { MathExtensionOptions } from "./types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      /** 插入行内公式 */
      insertInlineMath: (latex?: string) => ReturnType;
      /** 插入块级公式 */
      insertBlockMath: (latex?: string) => ReturnType;
      /** 更新公式内容 */
      updateMath: (latex: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathExtensionOptions>({
  name: "math",

  group: "inline",

  inline: true,

  atom: true,

  addOptions() {
    return {
      inline: true,
      block: true,
      katexOptions: DEFAULT_KATEX_OPTIONS,
    };
  },

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") || element.textContent || "",
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex,
        }),
      },
      block: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-block") === "true",
        renderHTML: (attributes) => ({
          "data-block": attributes.block ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math"]',
      },
      // div 变体只用于**读**：v0.2.0 之前块级公式被序列化成 div，已落库的内容要能读回来
      {
        tag: 'div[data-type="math"]',
      },
      // 支持从 Markdown 粘贴的 LaTeX
      {
        tag: "span.math-inline",
      },
      {
        tag: "div.math-block",
      },
    ];
  },

  /**
   * 一律输出 `span`，块级与否只由 `data-block` / class 表达。
   *
   * **不能按 `data-block` 切成 `div`**：本节点是 `inline: true`，只会出现在段落等
   * inline 容器里，于是块级公式会被序列化成 `<p><div …></div></p>`。这不是合法 HTML，
   * `getHTML()` → 存库 → `setContent()` 回读时，HTML 解析器会在 div 处把 `<p>` 劈开，
   * 每存读一轮就在公式前后各多出一个空段落，且逐轮累积（N 轮后多 2N 个空段落）；
   * 公式若插在句中，那句话还会被拦腰截断成两段。
   * 块级展示由 NodeView 的 `.is-block` 样式负责，与序列化标签无关。
   */
  renderHTML({ HTMLAttributes }) {
    const isBlock = HTMLAttributes["data-block"] === "true";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math",
        class: isBlock ? "math-node math-block" : "math-node math-inline",
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MathNodeView);
  },

  addCommands() {
    return {
      insertInlineMath:
        (latex = "") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex, block: false },
          });
        },

      insertBlockMath:
        (latex = "") =>
        ({ chain }) => {
          // 块级公式作为段落插入
          return chain()
            .insertContent({
              type: "paragraph",
              content: [
                {
                  type: this.name,
                  attrs: { latex, block: true },
                },
              ],
            })
            .run();
        },

      updateMath:
        (latex: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { latex });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + M: 插入行内公式
      "Mod-m": () => this.editor.commands.insertInlineMath(),
      // Ctrl/Cmd + Shift + M: 插入块级公式
      "Mod-Shift-m": () => this.editor.commands.insertBlockMath(),
    };
  },

  addInputRules() {
    // 支持 $...$ 语法（行内公式）
    const nodeType = this.type;

    return [
      new InputRule({
        // 匹配 $latex$ 格式
        find: /\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex) return null;

          const { tr } = state;
          tr.replaceWith(range.from, range.to, nodeType.create({ latex, block: false }));
        },
      }),
    ];
  },
});

export default MathExtension;
