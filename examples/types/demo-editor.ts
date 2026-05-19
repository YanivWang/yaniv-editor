import type { Editor as TiptapEditor } from "@tiptap/core";

/**
 * 演示脚本用的编辑器类型。
 * YanivEditor / Inline 示例在运行时注册了扩展命令，但 @tiptap/core 默认的 SingleCommands 未包含它们。
 */
export type DemoEditor = Omit<TiptapEditor, "commands"> & {
  commands: Record<string, (...args: unknown[]) => boolean>;
};

export function asDemoEditor(editor: TiptapEditor | null | undefined): DemoEditor | null {
  return editor ? (editor as DemoEditor) : null;
}
