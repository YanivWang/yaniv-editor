import { Plugin } from "@tiptap/pm/state";

import type { Extension } from "@tiptap/core";
import type { Ref } from "vue";

/**
 * 绕过只读事务守卫的 meta 键。
 *
 * **必须是字符串，不能用 `Symbol()`。** ProseMirror 的 meta 存取是
 * `this.meta[typeof key == "string" ? key : key.key]`：symbol 走后一支，
 * 而 symbol 没有 `.key` 属性，于是所有 symbol 键**共用** `meta["undefined"]` 这一个槽。
 * 实测后果——任意 symbol、任意没有 `.key` 的裸对象、乃至字符串 `"undefined"`
 * 都能读到（或写入）这个槽，也就是**任何第三方 meta 都能意外解除只读保护**。
 * 本常量还是公开导出的 API，宿主用自己的 symbol 作 meta 是完全合法的写法。
 *
 * 用带命名空间前缀的字符串既唯一又诚实，调用点也不再需要 `as unknown as string`
 * ——那个 cast 正是掩盖了 symbol 根本没在按 symbol 工作。
 * 与本仓库已有的 `"yaniv:source"` 同一风格。
 */
export const BYPASS_GUARD_META = "yaniv:bypassGuard";

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
            if (tr.getMeta(BYPASS_GUARD_META)) return true;
            return isEditable.value;
          },
        }),
      ];
    },
  });
}
