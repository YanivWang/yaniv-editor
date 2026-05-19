import { computed, reactive, ref } from "vue";

import { t } from "../../../src/locales";

import { createDefaultPlugins, inlineToolbarPresets } from "./pluginCatalog";

import type {
  InlineToolbarPluginView,
  InlineToolbarPreset,
  InlineToolbarPresetView,
} from "./types";

export function useInlinePlugins() {
  const plugins = reactive(createDefaultPlugins());
  const activeToolbarPreset = ref("writer");

  const localizedPlugins = computed<InlineToolbarPluginView[]>(() =>
    plugins.map((plugin) => ({
      ...plugin,
      name: t(`demo.inline.plugins.${plugin.id}.name`),
      description: t(`demo.inline.plugins.${plugin.id}.description`),
    })),
  );

  const localizedToolbarPresets = computed<InlineToolbarPresetView[]>(() =>
    inlineToolbarPresets.map((preset) => ({
      ...preset,
      label: t(`demo.inline.presets.${preset.id}`),
    })),
  );

  const enabledPluginViews = computed(() =>
    localizedPlugins.value.filter((plugin) => plugin.enabled),
  );
  const enabledCount = computed(() => enabledPluginViews.value.length);
  const totalCount = computed(() => plugins.length);
  const hasAnyPlugin = computed(() => enabledPluginViews.value.length > 0);

  function togglePlugin(id: string) {
    const plugin = plugins.find((item) => item.id === id);
    if (!plugin) return;
    plugin.enabled = !plugin.enabled;
    activeToolbarPreset.value = "";
  }

  function toggleAll(enabled: boolean) {
    plugins.forEach((plugin) => {
      plugin.enabled = enabled;
    });
    activeToolbarPreset.value = enabled ? "full" : "";
  }

  function applyToolbarPreset(preset: InlineToolbarPreset) {
    plugins.forEach((plugin) => {
      plugin.enabled = preset.plugins.includes(plugin.id);
    });
    activeToolbarPreset.value = preset.id;
  }

  return {
    plugins,
    activeToolbarPreset,
    localizedPlugins,
    localizedToolbarPresets,
    enabledPluginViews,
    enabledCount,
    totalCount,
    hasAnyPlugin,
    togglePlugin,
    toggleAll,
    applyToolbarPreset,
  };
}
