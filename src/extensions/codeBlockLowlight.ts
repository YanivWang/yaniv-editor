/**
 * Code Block Lowlight - 语法高亮代码块扩展
 * @description 使用 lowlight + highlight.js 为代码块提供语法高亮
 */

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import xml from "highlight.js/lib/languages/xml";
import { createLowlight, common } from "lowlight";

import { DEFAULT_CODE_BLOCK_LANGUAGE } from "@/configs/editorConstants";

export { DEFAULT_CODE_BLOCK_LANGUAGE };

const lowlight = createLowlight(common);

// common 未包含 html，用 xml 语法注册 html 别名
lowlight.register("html", xml);

export const codeBlockLowlightExtension = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: DEFAULT_CODE_BLOCK_LANGUAGE,
  languageClassPrefix: "language-",
});
