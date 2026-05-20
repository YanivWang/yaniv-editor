import hotkeys from "hotkeys-js";
import { onBeforeUnmount, onMounted } from "vue";

export interface UseFindReplaceHotkeyOptions {
  /** 为 false 时不拦截 Ctrl/Cmd+F */
  enabled: () => boolean;
  onOpen: () => void;
}

/**
 * 查找替换面板快捷键（Ctrl/Cmd+F），与 SearchReplace 扩展解耦，供工具栏或其他入口复用。
 */
export function useFindReplaceHotkey(options: UseFindReplaceHotkeyOptions) {
  let previousFilter: typeof hotkeys.filter | null = null;
  const filter = () => true;

  onMounted(() => {
    previousFilter = hotkeys.filter;
    hotkeys.filter = filter;
    hotkeys("ctrl+f,command+f", (evt) => {
      if (!options.enabled()) return;
      evt?.preventDefault?.();
      options.onOpen();
    });
  });
  onBeforeUnmount(() => {
    hotkeys.unbind("ctrl+f,command+f");
    if (hotkeys.filter === filter && previousFilter) {
      hotkeys.filter = previousFilter;
    }
    previousFilter = null;
  });
}
