import { computed, type ComputedRef } from "vue";

import { useEditorRoot } from "@/core/editorContext";
import { getYeZIndex, type YeZIndexToken } from "@/utils/zIndex";

/** 在 Vue 组件内响应式读取 z-index token（绑定当前编辑器实例根节点）。 */
export function useYeZIndex(token: YeZIndexToken): ComputedRef<number> {
  const editorRoot = useEditorRoot();

  return computed(() => {
    const root = editorRoot.value;
    if (!root) {
      throw new Error("Editor root is not mounted");
    }
    return getYeZIndex(token, root);
  });
}
