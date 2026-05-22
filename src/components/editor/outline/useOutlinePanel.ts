import { inject, provide, ref, type InjectionKey, type Ref } from "vue";

export interface OutlinePanelContext {
  expanded: Ref<boolean>;
  toggle: () => void;
  close: () => void;
}

const OUTLINE_PANEL_KEY: InjectionKey<OutlinePanelContext> = Symbol("outlinePanel");

export function provideOutlinePanel(defaultExpanded = false): OutlinePanelContext {
  const expanded = ref(defaultExpanded);

  const context: OutlinePanelContext = {
    expanded,
    toggle: () => {
      expanded.value = !expanded.value;
    },
    close: () => {
      expanded.value = false;
    },
  };

  provide(OUTLINE_PANEL_KEY, context);
  return context;
}

export function useOutlinePanel(): OutlinePanelContext {
  const context = inject(OUTLINE_PANEL_KEY);
  if (!context) {
    throw new Error("[useOutlinePanel] must be used within EditorShell");
  }
  return context;
}
