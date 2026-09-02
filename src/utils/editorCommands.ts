/**
 * Editor Commands Utilities
 * @description 编辑器命令执行工具函数（内部工具，不在包的公开 exports 里）
 */

import { toValue, type MaybeRefOrGetter } from "vue";

import type { Editor } from "@tiptap/core";

/**
 * 链式命令类型
 */
export type EditorChain = ReturnType<Editor["chain"]>;

/**
 * 命令构建函数类型
 */
export type CommandBuilder = (chain: EditorChain) => EditorChain;

/**
 * 取出可用的编辑器实例；取不到就留一条诊断。
 *
 * 四个入口此前各写一份逐字相同的判空 + `console.warn`，这里收敛成一处。
 */
function resolveEditor(source: MaybeRefOrGetter<Editor | null | undefined>): Editor | null {
  const editor = toValue(source);
  if (!editor) {
    console.warn("[editorCommands] Editor instance is null or undefined");
    return null;
  }
  return editor;
}

/**
 * 创建命令执行器
 * @description 创建一个命令执行函数，自动处理 editor 实例检查和焦点管理
 * @param editor - 编辑器实例引用
 * @returns 命令执行函数
 *
 * @example
 * ```typescript
 * const runCommand = createCommandRunner(editor)
 * const toggleBold = runCommand((chain) => chain.toggleBold())
 * toggleBold() // 执行粗体切换
 * ```
 */
export function createCommandRunner(editor: MaybeRefOrGetter<Editor | null | undefined>) {
  return (fn: CommandBuilder) => () => {
    const e = resolveEditor(editor);
    if (!e) return;
    fn(e.chain().focus()).run();
  };
}

/**
 * 批量执行命令
 * @description 按顺序执行多个命令
 * @param editor - 编辑器实例引用
 * @param commands - 命令构建函数数组
 * @param withFocus - 是否自动聚焦，默认 true
 * @returns 所有命令是否都执行成功
 *
 * @example
 * ```typescript
 * executeBatchCommands(editor, [
 *   (chain) => chain.toggleBold(),
 *   (chain) => chain.setColor('#ff0000')
 * ])
 * ```
 */
export function executeBatchCommands(
  editor: MaybeRefOrGetter<Editor | null | undefined>,
  commands: CommandBuilder[],
  withFocus = true,
): boolean {
  const e = resolveEditor(editor);
  if (!e) return false;

  let chain = withFocus ? e.chain().focus() : e.chain();

  for (const command of commands) {
    chain = command(chain);
  }

  return chain.run();
}
