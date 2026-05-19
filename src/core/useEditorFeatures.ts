import { computed } from "vue";

import { applyExtensionGatesToToolbarConfig } from "@/configs/editorCapabilityMap";
import { resolveExtensionGates } from "@/extensions/resolveExtensionGates";
import {
  BASIC_TOOLBAR_CONFIG,
  ADVANCED_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/tools/header-nav";

import type { TiptapProEditorProps } from "./editorTypes";

type FeatureName = "headerNav" | "footerNav";

export function useEditorFeatures(props: TiptapProEditorProps) {
  const getFeatureConfig = (featureName: FeatureName): boolean => {
    if (props.features?.[featureName] !== undefined) {
      return props.features[featureName];
    }
    if (props.versionConfig?.features?.[featureName] !== undefined) {
      return props.versionConfig.features[featureName];
    }
    return false;
  };

  const shouldShowHeaderNav = computed(() => getFeatureConfig("headerNav"));
  const shouldShowFooterNav = computed(() => getFeatureConfig("footerNav"));

  const resolvedExtensionGates = computed(() =>
    resolveExtensionGates({
      version: props.version ?? "basic",
      features: props.features,
      versionConfig: props.versionConfig,
    }),
  );

  const toolbarConfig = computed<ToolbarToolsConfig>(() => {
    const base: ToolbarToolsConfig =
      props.version === "advanced" || props.version === "premium"
        ? {
            ...ADVANCED_TOOLBAR_CONFIG,
            codeBlock: true,
            link: true,
            table: true,
            font: true,
            lineHeight: true,
            clearFormat: true,
            undoRedo: true,
            subscriptSuperscript: true,
            formatPainter: true,
          }
        : {
            ...BASIC_TOOLBAR_CONFIG,
            undoRedo: true,
          };

    return applyExtensionGatesToToolbarConfig(base, resolvedExtensionGates.value);
  });

  const showStatusShortcutHints = computed(() => props.features?.statusShortcutHints !== false);

  return {
    getFeatureConfig,
    shouldShowHeaderNav,
    shouldShowFooterNav,
    resolvedExtensionGates,
    toolbarConfig,
    showStatusShortcutHints,
  };
}
