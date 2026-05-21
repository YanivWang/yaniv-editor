import { Extension } from "@tiptap/core";

let boundScrollParent: HTMLElement | null = null;

export function getBoundOutlineScrollParent(): HTMLElement | null {
  return boundScrollParent;
}

export function setBoundOutlineScrollParent(el: HTMLElement | null): void {
  boundScrollParent = el;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bindOutlineScrollParent: {
      bindOutlineScrollParent: (element: HTMLElement) => ReturnType;
    };
  }
}

export const OutlineScrollParentBinder = Extension.create({
  name: "outlineScrollParentBinder",

  addCommands() {
    return {
      bindOutlineScrollParent: (element: HTMLElement) => () => {
        setBoundOutlineScrollParent(element);
        return true;
      },
    };
  },
});
