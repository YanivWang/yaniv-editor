import { inject, provide, type ComputedRef, type InjectionKey } from "vue";

import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";

import type { ResolvedChromePolicy, EditorRuntimeProfile, PresetLayout, UiFlags } from "./types";

export interface EditorRuntimeContext {
  profile: ComputedRef<EditorRuntimeProfile>;
  chrome: ComputedRef<ResolvedChromePolicy>;
  toolbarConfig: ComputedRef<ToolbarToolsConfig>;
  presetLayout: ComputedRef<PresetLayout>;
  uiFlags: ComputedRef<UiFlags>;
}

export const editorRuntimeKey: InjectionKey<EditorRuntimeContext> = Symbol("editorRuntime");

export function provideEditorRuntime(ctx: EditorRuntimeContext): void {
  provide(editorRuntimeKey, ctx);
}

export function useEditorRuntimeContext(): EditorRuntimeContext {
  const ctx = inject(editorRuntimeKey);
  if (!ctx) {
    throw new Error("[useEditorRuntime] must be used within EditorShell");
  }
  return ctx;
}
