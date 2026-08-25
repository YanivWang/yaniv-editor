import { inject, provide, ref, type InjectionKey, type Ref } from "vue";

export interface FindReplacePanelContext {
  visible: Ref<boolean>;
  open: () => void;
  close: () => void;
}

const FIND_REPLACE_PANEL_KEY: InjectionKey<FindReplacePanelContext> = Symbol("findReplacePanel");

/**
 * 查找替换面板的开关状态，由 EditorShell 根提供。
 *
 * 拆出这一层是为了让「面板 + 快捷键」与「顶栏按钮」解耦：
 * 面板归 `FindReplaceDialog`（挂在 EditorEditChrome，只看 `gates.searchReplace`），
 * 按钮归 `FindReplaceButton`（挂在顶栏，看 `toolbarConfig.searchReplace`）。
 * 此前二者揉在一个组件里，导致隐藏顶栏的 preset（notion）连 Ctrl/Cmd+F 都注册不上。
 */
export function provideFindReplacePanel(): FindReplacePanelContext {
  const visible = ref(false);

  const context: FindReplacePanelContext = {
    visible,
    open: () => {
      visible.value = true;
    },
    close: () => {
      visible.value = false;
    },
  };

  provide(FIND_REPLACE_PANEL_KEY, context);
  return context;
}

export function useFindReplacePanel(): FindReplacePanelContext {
  const context = inject(FIND_REPLACE_PANEL_KEY);
  if (!context) {
    throw new Error("[useFindReplacePanel] must be used within EditorShell");
  }
  return context;
}
