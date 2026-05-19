/**
 * Code Block Lowlight - 语法高亮代码块扩展
 * @description 使用 lowlight + highlight.js 为代码块提供语法高亮
 */

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";

import { DEFAULT_CODE_BLOCK_LANGUAGE } from "@/configs/editorConstants";

export { DEFAULT_CODE_BLOCK_LANGUAGE };

const lowlight = createLowlight(common);

// common 含 xml 但无 html 键，注册为 html 别名供语言选择器使用
lowlight.register("html", common.xml);

export const codeBlockLowlightExtension = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: DEFAULT_CODE_BLOCK_LANGUAGE,
  languageClassPrefix: "language-",
});
