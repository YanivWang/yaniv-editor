import { onBeforeUnmount, onMounted } from "vue";

export interface UseFindReplaceHotkeyOptions {
  /** 为 false 时不拦截 Ctrl/Cmd+F */
  enabled: () => boolean;
  onOpen: () => void;
}

type HotkeysModule = typeof import("hotkeys-js").default;

/**
 * 查找替换面板快捷键（Ctrl/Cmd+F），与 SearchReplace 扩展解耦，供工具栏或其他入口复用。
 * hotkeys-js 按需加载，避免未启用查找替换时强依赖。
 */
export function useFindReplaceHotkey(options: UseFindReplaceHotkeyOptions) {
  let hotkeys: HotkeysModule | null = null;
  let previousFilter: HotkeysModule["filter"] | null = null;
  const filter = () => true;

  onMounted(async () => {
    hotkeys = (await import("hotkeys-js")).default;
    previousFilter = hotkeys.filter;
    hotkeys.filter = filter;
    hotkeys("ctrl+f,command+f", (evt) => {
      if (!options.enabled()) return;
      evt?.preventDefault?.();
      options.onOpen();
    });
  });

  onBeforeUnmount(() => {
    if (!hotkeys) return;
    hotkeys.unbind("ctrl+f,command+f");
    if (hotkeys.filter === filter && previousFilter) {
      hotkeys.filter = previousFilter;
    }
    hotkeys = null;
    previousFilter = null;
  });
}
