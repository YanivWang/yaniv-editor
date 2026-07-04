import { computed, type ComputedRef, type Ref } from "vue";

import { applyGatesToToolbarConfig } from "@/capabilities/applyGatesToToolbarConfig";
import { CAPABILITIES } from "@/capabilities/registry";
import { resolveShowInlineToolbar } from "@/capabilities/resolveShowInlineToolbar";
import { fullEditorPresetConfig } from "@/configs/editorPreset";
import { DEFAULT_INLINE_TOOLBAR } from "@/configs/inlineToolbar";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import type { YanivEditorProps } from "@/core/editorTypes";
import type { LocaleCode } from "@/locales/types";

import { computeSessionKey } from "./computeSessionKey";
import { provideEditorRuntime } from "./editorRuntimeContext";
import { resolveChromePolicy } from "./resolveChromePolicy";
import { resolveEditorProfile } from "./resolveEditorProfile";
import { resolveInlineGates } from "./resolveInlineGates";

import type { UiFlags } from "./types";
import type { AnyExtension } from "@tiptap/core";

export interface UseEditorRuntimeFullOptions {
  host: "full";
  props: Ref<YanivEditorProps> | ComputedRef<YanivEditorProps>;
  locale: Ref<LocaleCode> | ComputedRef<LocaleCode>;
}

export interface UseEditorRuntimeInlineOptions {
  host: "inline";
  mode: Ref<"edit" | "preview">;
  toolbar: Ref<InlineToolbarConfig | undefined>;
  locale: Ref<LocaleCode>;
  inlinePlaceholder?: Ref<string | undefined> | ComputedRef<string | undefined>;
  extraExtensions?: Ref<AnyExtension[] | undefined> | ComputedRef<AnyExtension[] | undefined>;
}

export function useEditorRuntime(
  options: UseEditorRuntimeFullOptions | UseEditorRuntimeInlineOptions,
) {
  const host = options.host;

  const profile = computed(() => {
    if (host === "full") {
      const p = options.props.value;
      return resolveEditorProfile({
        mode: p.mode,
        preset: p.preset,
        features: p.features,
      });
    }
    const gates = resolveInlineGates(options.toolbar.value ?? DEFAULT_INLINE_TOOLBAR, CAPABILITIES);
    return {
      mode: options.mode.value,
      preset: "basic" as const,
      features: {} as never,
      gates,
    };
  });

  const presetLayout = computed(() =>
    host === "full"
      ? fullEditorPresetConfig[options.props.value.preset ?? "basic"].layout
      : {
          header: false,
          footer: false,
          floatingMenu: false,
          linkBubble: false,
          tableTools: false,
          shortcutHints: false,
          outlineAnchor: "top-left" as const,
          zoomPlacement: "bottom" as const,
          tableToolsShowMode: 2 as const,
        },
  );

  const uiFlags = computed((): UiFlags => {
    const layout = presetLayout.value;
    const gates = profile.value.gates;
    if (host === "inline") {
      return {
        linkBubble: gates.link === true,
        tableTools: false,
        image: false,
        video: false,
        floatingMenu: false,
      };
    }
    return {
      linkBubble: layout.linkBubble,
      tableTools: layout.tableTools && gates.table === true,
      image: gates.image === true,
      video: gates.video === true,
      floatingMenu: layout.floatingMenu,
    };
  });

  const toolbarConfig = computed(() => {
    if (host === "inline") {
      return options.toolbar.value ?? DEFAULT_INLINE_TOOLBAR;
    }
    const base = fullEditorPresetConfig[options.props.value.preset ?? "basic"].toolbar;
    return applyGatesToToolbarConfig(base, profile.value.gates);
  });

  const showInlineToolbar = computed(() =>
    host === "inline"
      ? resolveShowInlineToolbar(options.toolbar.value ?? DEFAULT_INLINE_TOOLBAR, CAPABILITIES)
      : false,
  );

  const chrome = computed(() =>
    resolveChromePolicy({
      profile: profile.value,
      layout: presetLayout.value,
      gates: profile.value.gates,
      uiFlags: uiFlags.value,
      host,
      showInlineToolbar: showInlineToolbar.value,
    }),
  );

  const runtimeSignature = computed(() => {
    if (host !== "inline") return "";
    return JSON.stringify({
      inlinePlaceholder: options.inlinePlaceholder?.value ?? "",
      extraExtensions: (options.extraExtensions?.value ?? []).map((extension) => extension.name),
    });
  });

  const sessionKey = computed(() =>
    computeSessionKey(
      profile.value,
      host,
      options.locale.value,
      CAPABILITIES,
      runtimeSignature.value,
    ),
  );

  const runtime = { profile, chrome, toolbarConfig, presetLayout, uiFlags, sessionKey };
  provideEditorRuntime(runtime);

  return runtime;
}
