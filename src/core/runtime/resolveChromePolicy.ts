import type {
  FullChromePolicy,
  InlineChromePolicy,
  ResolvedChromePolicy,
  ResolveChromePolicyInput,
} from "./types";

export function resolveChromePolicy(input: ResolveChromePolicyInput): ResolvedChromePolicy {
  const { profile, layout, gates, uiFlags, host, showInlineToolbar = false } = input;
  const isEdit = profile.mode === "edit";
  const showEditChrome = isEdit;

  if (host === "inline") {
    const policy: InlineChromePolicy = {
      host: "inline",
      showEditChrome,
      showInlineToolbar: showEditChrome && showInlineToolbar,
      showLinkBubble: showEditChrome && gates.link === true,
    };
    return policy;
  }

  const policy: FullChromePolicy = {
    host: "full",
    showEditChrome,
    showHeader: isEdit && layout.header,
    showFooter: isEdit ? layout.footer : false,
    showOutlineRail: isEdit && gates.outline === true,
    showContextualToolbars:
      isEdit &&
      (uiFlags.linkBubble ||
        uiFlags.tableTools ||
        uiFlags.image ||
        uiFlags.video ||
        uiFlags.floatingMenu),
    showBlockPicker: isEdit && (gates.slashCommand === true || gates.dragHandle === true),
    showStatusHints: isEdit && layout.shortcutHints,
  };

  return policy;
}
