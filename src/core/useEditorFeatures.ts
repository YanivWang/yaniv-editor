import { computed } from "vue";

import { applyExtensionGatesToToolbarConfig } from "@/configs/editorCapabilityMap";
import { resolveExtensionGates } from "@/extensions/resolveExtensionGates";
import {
  BASIC_TOOLBAR_CONFIG,
  ADVANCED_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/tools/header-nav";

import { DEFAULT_EDITOR_VERSION, type YanivEditorProps } from "./editorTypes";

type FeatureName = "headerNav" | "footerNav";

export function useEditorFeatures(props: YanivEditorProps) {
  const resolvedVersion = computed(() => props.version ?? DEFAULT_EDITOR_VERSION);

  const getFeatureConfig = (featureName: FeatureName): boolean => {
    return props.features?.[featureName] === true;
  };

  const shouldShowHeaderNav = computed(() => getFeatureConfig("headerNav"));
  const shouldShowFooterNav = computed(() => getFeatureConfig("footerNav"));

  const resolvedExtensionGates = computed(() =>
    resolveExtensionGates({
      version: resolvedVersion.value,
      features: props.features,
    }),
  );

  const toolbarConfig = computed<ToolbarToolsConfig>(() => {
    const base: ToolbarToolsConfig =
      resolvedVersion.value === "advanced"
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
