import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bindOutlineScrollParent: {
      bindOutlineScrollParent: (element: HTMLElement | null) => ReturnType;
    };
  }
}

export interface OutlineScrollParentBinderOptions {
  /**
   * 把滚动容器写回 Shell 持有的 `BuildExtensionsCtx.outline` 存储。
   * 由 registry 注入 `ctx.outline.bindScrollParent`，保证每个编辑器实例各存各的。
   */
  bindScrollParent: (element: HTMLElement | null) => void;
}

/**
 * 暴露 `bindOutlineScrollParent` command，供 `EditorWorkspace` 在 mount 后
 * 把 `.document-container` 注入给 `TableOfContents` 的 `scrollParent` getter。
 *
 * 注意：绑定结果**必须**写回 ctx（实例作用域）。此前这里用模块级变量存储，
 * 而 registry 的 getter 读的是 ctx，两者互不相通导致 scrollParent 恒回退 window；
 * 模块级单例同时也会让同页多个开启 outline 的编辑器互相覆盖。
 */
export function createOutlineScrollParentBinder(
  options: OutlineScrollParentBinderOptions,
): Extension<OutlineScrollParentBinderOptions> {
  return Extension.create<OutlineScrollParentBinderOptions>({
    name: "outlineScrollParentBinder",

    addOptions() {
      return options;
    },

    addCommands() {
      return {
        bindOutlineScrollParent: (element: HTMLElement | null) => () => {
          this.options.bindScrollParent(element);
          return true;
        },
      };
    },

    onDestroy() {
      this.options.bindScrollParent(null);
    },
  });
}
