import { computed } from "vue";

import {
  COMPACT_TOOLBAR_CONFIG,
  FULL_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/components/tools/header-nav";
import { applyExtensionGatesToToolbarConfig } from "@/configs/editorCapabilityMap";
import { isFeatureEnabled, resolveExtensionGates } from "@/extensions/resolveExtensionGates";

import type { YanivEditorProps } from "./editorTypes";

export function useEditorFeatures(props: YanivEditorProps) {
  const features = computed(() => props.features);

  const shouldShowHeaderNav = computed(() => isFeatureEnabled(features.value, "headerNav"));
  const shouldShowFooterNav = computed(() => isFeatureEnabled(features.value, "footerNav"));

  const resolvedExtensionGates = computed(() =>
    resolveExtensionGates({
      features: features.value,
    }),
  );

  const toolbarConfig = computed<ToolbarToolsConfig>(() => {
    const base =
      features.value?.toolbar === "compact" ? COMPACT_TOOLBAR_CONFIG : FULL_TOOLBAR_CONFIG;

    return applyExtensionGatesToToolbarConfig(base, resolvedExtensionGates.value);
  });

  const showStatusShortcutHints = computed(() =>
    isFeatureEnabled(features.value, "statusShortcutHints"),
  );

  const uiFlags = computed(() => ({
    linkBubbleMenu: isFeatureEnabled(features.value, "linkBubbleMenu"),
    tableToolbar: isFeatureEnabled(features.value, "tableToolbar"),
    image: isFeatureEnabled(features.value, "image"),
    video: isFeatureEnabled(features.value, "video"),
    floatingMenu: isFeatureEnabled(features.value, "floatingMenu"),
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
  };
}
