import type { YanivEditorExpose } from "@/core/editorTypes";

import type { Ref } from "vue";

/** EditorShell 组件 expose，避免 InstanceType<typeof EditorShell> 带入 any */
export type EditorShellExpose = YanivEditorExpose;

export interface EditorWorkspaceExpose {
  containerRef: Ref<HTMLElement | null>;
}
