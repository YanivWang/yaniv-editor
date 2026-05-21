import { computed } from "vue";

import type { ToolbarToolsConfig } from "@/components/tools/header-nav";
import { applyExtensionGatesToToolbarConfig } from "@/configs/editorCapabilityMap";
import { fullEditorPresetConfig, resolvePresetFeatures } from "@/configs/editorPreset";
import { resolveExtensionGates } from "@/extensions/resolveExtensionGates";

import type { YanivEditorProps } from "./editorTypes";

export function useEditorFeatures(props: YanivEditorProps) {
  const preset = computed(() => props.preset ?? "basic");
  const presetConfig = computed(() => fullEditorPresetConfig[preset.value]);
  const features = computed(() => resolvePresetFeatures(preset.value, props.features));

  const shouldShowHeaderNav = computed(() => presetConfig.value.layout.header);
  const shouldShowFooterNav = computed(() => presetConfig.value.layout.footer);

  const resolvedExtensionGates = computed(() =>
    resolveExtensionGates({
      features: features.value,
    }),
  );

  const toolbarConfig = computed<ToolbarToolsConfig>(() => {
    // 先取 preset 的工具栏方案，再用能力 gate 收口，避免出现按钮可见但扩展未注册。
    return applyExtensionGatesToToolbarConfig(
      presetConfig.value.toolbar,
      resolvedExtensionGates.value,
    );
  });

  const showStatusShortcutHints = computed(() => presetConfig.value.layout.shortcutHints);

  const uiFlags = computed(() => ({
    linkBubble: presetConfig.value.layout.linkBubble,
    // 上下文工具栏既要遵守 preset 的布局策略，也要随 features 显式关闭对应能力。
    tableTools: presetConfig.value.layout.tableTools && resolvedExtensionGates.value.table,
    image: resolvedExtensionGates.value.image,
    video: resolvedExtensionGates.value.video,
    floatingMenu: presetConfig.value.layout.floatingMenu,
  }));

  const showBlockPickerMenu = computed(
    () => resolvedExtensionGates.value.slashCommand || resolvedExtensionGates.value.dragHandle,
  );

  return {
    shouldShowHeaderNav,
    shouldShowFooterNav,
    resolvedExtensionGates,
    toolbarConfig,
    showStatusShortcutHints,
    uiFlags,
    showBlockPickerMenu,
    presetLayout: computed(() => presetConfig.value.layout),
  };
}
