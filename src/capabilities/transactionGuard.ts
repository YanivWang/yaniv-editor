import { Plugin } from "@tiptap/pm/state";

import type { Extension } from "@tiptap/core";
import type { Ref } from "vue";

export const BYPASS_GUARD_META: symbol = Symbol("yaniv:bypassGuard");

export function withTransactionGuard(
  ext: Extension,
  isEditable: Readonly<Ref<boolean>>,
): Extension {
  return ext.extend({
    addProseMirrorPlugins() {
      const self = this as { parent?: () => Plugin[] };
      const parent = self.parent?.() ?? [];
      return [
        ...parent,
        new Plugin({
          filterTransaction: (tr) => {
            if (!tr.docChanged) return true;
            if (tr.getMeta(BYPASS_GUARD_META as unknown as string)) return true;
            return isEditable.value;
          },
        }),
      ];
    },
  });
}
