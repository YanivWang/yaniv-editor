import { onBeforeUnmount, watch, type Ref } from "vue";

import type { Editor } from "@tiptap/core";

/**
 * 「虚拟焦点」弹层的无障碍绑定（斜杠命令菜单、提及菜单）。
 *
 * 这类菜单的键盘焦点**始终留在正文**（弹层用 `@mousedown.prevent` 阻止夺焦，
 * 上下键由扩展在 ProseMirror 层处理），因此不能靠 DOM 焦点告知辅助技术当前选中项。
 * WAI-ARIA 对此的答案是 `aria-activedescendant`：由持有焦点的元素指向逻辑上的活动项。
 *
 * 本 composable 在弹层可见期间给编辑器正文挂上：
 * - `aria-expanded` —— 弹层是否展开
 * - `aria-controls` —— 指向弹层的 id
 * - `aria-activedescendant` —— 指向当前高亮项的 id
 *
 * 弹层关闭或组件卸载时清除，避免正文上残留失效引用。
 *
 * 不修改正文的 `role`：它本质仍是 textbox，仅在菜单开启的瞬间临时变成 combobox
 * 会让部分屏幕阅读器的浏览模式抖动，收益不抵风险。
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_focus_activedescendant
 */
export interface VirtualFocusPopupOptions {
  /** 只读即可：本 composable 仅访问 `view.dom`，不改动编辑器 */
  editor: Readonly<Ref<Editor | null>>;
  /** 弹层是否可见 */
  visible: Readonly<Ref<boolean>>;
  /** 弹层容器的 id（同时用于 aria-controls） */
  popupId: string;
  /** 当前活动项的 id；无活动项时返回 null */
  activeOptionId: Readonly<Ref<string | null>>;
}

const MANAGED_ATTRS = ["aria-expanded", "aria-controls", "aria-activedescendant"] as const;

export function useVirtualFocusPopup(options: VirtualFocusPopupOptions): void {
  const { editor, visible, popupId, activeOptionId } = options;

  const contentEl = (): HTMLElement | null => {
    const view = editor.value?.view;
    if (!view || editor.value?.isDestroyed) return null;
    return view.dom;
  };

  const clear = (): void => {
    const el = contentEl();
    if (!el) return;
    for (const attr of MANAGED_ATTRS) el.removeAttribute(attr);
  };

  const sync = (): void => {
    const el = contentEl();
    if (!el) return;

    if (!visible.value) {
      clear();
      return;
    }

    el.setAttribute("aria-expanded", "true");
    el.setAttribute("aria-controls", popupId);

    const active = activeOptionId.value;
    if (active) {
      el.setAttribute("aria-activedescendant", active);
    } else {
      el.removeAttribute("aria-activedescendant");
    }
  };

  watch([visible, activeOptionId, editor], sync, { immediate: true, flush: "post" });

  onBeforeUnmount(clear);
}
