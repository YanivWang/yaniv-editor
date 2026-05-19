import { computed } from "vue";

import {
  COMPACT_TOOLBAR_CONFIG,
  FULL_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/components/tools/header-nav";
import { applyExtensionGatesToToolbarConfig } from "@/configs/editorCapabilityMap";
import { resolveExtensionGates } from "@/extensions/resolveExtensionGates";

import type { YanivEditorProps } from "./editorTypes";

type FeatureName = "headerNav" | "footerNav";

export function useEditorFeatures(props: YanivEditorProps) {
  const getFeatureConfig = (featureName: FeatureName): boolean => {
    return props.features?.[featureName] === true;
  };

  const shouldShowHeaderNav = computed(() => getFeatureConfig("headerNav"));
  const shouldShowFooterNav = computed(() => getFeatureConfig("footerNav"));

  const resolvedExtensionGates = computed(() =>
    resolveExtensionGates({
      features: props.features,
    }),
  );

  const toolbarConfig = computed<ToolbarToolsConfig>(() => {
    const base =
      props.features?.toolbar === "compact" ? COMPACT_TOOLBAR_CONFIG : FULL_TOOLBAR_CONFIG;

    return applyExtensionGatesToToolbarConfig(base, resolvedExtensionGates.value);
  });

  const showStatusShortcutHints = computed(() => props.features?.statusShortcutHints !== false);

  return {
    shouldShowHeaderNav,
    shouldShowFooterNav,
    resolvedExtensionGates,
    toolbarConfig,
    showStatusShortcutHints,
  };
}
