import { onBeforeUnmount, watch, type Ref } from "vue";

import { useEditorRootOptional } from "@/core/editorContext";

export interface UseFindReplaceHotkeyOptions {
  /** 为 false 时不拦截 Ctrl/Cmd+F */
  enabled: () => boolean;
  onOpen: () => void;
  /**
   * 监听目标，默认取当前 EditorShell 根节点。
   * 传入自定义元素可在编辑器外复用（例如宿主自建 shell）。
   */
  target?: Ref<HTMLElement | null>;
}

/** 严格匹配 Ctrl/Cmd+F，排除带 Shift / Alt 的组合（如 Ctrl+Shift+F 常被宿主占用） */
function isFindShortcut(event: KeyboardEvent): boolean {
  if (event.key !== "f" && event.key !== "F") return false;
  if (event.shiftKey || event.altKey) return false;
  return event.metaKey || event.ctrlKey;
}

/**
 * 查找替换面板快捷键（Ctrl/Cmd+F），与 SearchReplace 扩展解耦。
 *
 * 监听挂在**编辑器根节点**上而非 document：快捷键是实例级的，只有焦点位于该编辑器内
 * （事件冒泡到根）时才拦截，焦点在页面别处时把 Ctrl/Cmd+F 留给浏览器原生查找。
 *
 * 早期实现用 hotkeys-js 注册全局快捷键，在同页多实例下有三个问题：
 * ① 每个实例各注册一次 handler，按一次会同时弹出多个查找面板；
 * ② `hotkeys.unbind("ctrl+f,command+f")` 解绑的是全部 handler，一个实例卸载会废掉其他实例；
 * ③ `hotkeys.filter = () => true` 是全局覆盖，会连带影响宿主自己用 hotkeys-js 注册的快捷键。
 * 改为根节点监听后三者同时消失，也不再需要 hotkeys-js 依赖。
 */
export function useFindReplaceHotkey(options: UseFindReplaceHotkeyOptions): void {
  const injectedRoot = options.target ? null : useEditorRootOptional();
  const targetRef = options.target ?? injectedRoot;

  if (!targetRef) {
    throw new Error(
      "[useFindReplaceHotkey] must be used within EditorShell, or pass an explicit `target`",
    );
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!isFindShortcut(event)) return;
    if (!options.enabled()) return;
    event.preventDefault();
    options.onOpen();
  }

  let bound: HTMLElement | null = null;

  function bind(el: HTMLElement | null): void {
    if (bound === el) return;
    bound?.removeEventListener("keydown", handleKeyDown);
    bound = el;
    bound?.addEventListener("keydown", handleKeyDown);
  }

  watch(targetRef, (el) => bind(el), { immediate: true });

  onBeforeUnmount(() => bind(null));
}
