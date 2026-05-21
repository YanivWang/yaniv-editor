import { describe, expect, it } from "vitest";

import type { CapabilityDefinition } from "@/capabilities/types";

import { computeSessionKey } from "./computeSessionKey";
import { mergeFeatures } from "./mergeFeatures";
import { resolveChromePolicy } from "./resolveChromePolicy";
import { resolveEditorProfile, PRESET_DEFAULT_FEATURES } from "./resolveEditorProfile";
import { resolveInlineGates } from "./resolveInlineGates";

const MOCK_CAPS: CapabilityDefinition[] = [
  { id: "core", tier: "core", order: 0, extensions: () => [] },
  { id: "table", tier: "content", order: 10, featureKey: "table", extensions: () => [] },
  {
    id: "inline-link",
    tier: "content",
    order: 10,
    inlineToolbarSlugs: ["link"],
    extensions: () => [],
  },
];

const testLayout = {
  header: true,
  footer: true,
  floatingMenu: true,
  linkBubble: true,
  tableTools: true,
  shortcutHints: true,
  outlineAnchor: "top-left" as const,
  zoomPlacement: "bottom" as const,
  tableToolsShowMode: 2 as const,
};

describe("resolveEditorProfile", () => {
  it("basic preset 默认关闭 table", () => {
    expect(resolveEditorProfile({ preset: "basic" }).gates.table).toBe(false);
  });

  it("features.table=true 覆盖 basic preset 默认值", () => {
    expect(resolveEditorProfile({ preset: "basic", features: { table: true } }).gates.table).toBe(
      true,
    );
  });

  it("features.table=undefined 不覆盖 full preset 默认值", () => {
    expect(
      resolveEditorProfile({ preset: "full", features: { table: undefined } }).gates.table,
    ).toBe(true);
  });
});

describe("resolveChromePolicy", () => {
  const layout = testLayout;

  it("preview 模式 showOutlineRail=false", () => {
    const profile = resolveEditorProfile({ mode: "preview", preset: "full" });
    const policy = resolveChromePolicy({
      profile,
      layout,
      gates: profile.gates,
      uiFlags: { linkBubble: true, tableTools: true, image: true, video: true, floatingMenu: true },
      host: "full",
    });
    expect(policy.host === "full" && policy.showOutlineRail).toBe(false);
  });

  it("edit 模式 + outline gate 开 → showOutlineRail=true", () => {
    const profile = resolveEditorProfile({
      mode: "edit",
      preset: "full",
      features: { outline: true },
    });
    const policy = resolveChromePolicy({
      profile,
      layout,
      gates: profile.gates,
      uiFlags: { linkBubble: true, tableTools: true, image: true, video: true, floatingMenu: true },
      host: "full",
    });
    expect(policy.host === "full" && policy.showOutlineRail).toBe(true);
  });

  it("chromePolicy 不含 outlinePanelExpanded", () => {
    const profile = resolveEditorProfile({ mode: "edit", preset: "full" });
    const policy = resolveChromePolicy({
      profile,
      layout,
      gates: profile.gates,
      uiFlags: {
        linkBubble: false,
        tableTools: false,
        image: false,
        video: false,
        floatingMenu: false,
      },
      host: "full",
    });
    expect("outlinePanelExpanded" in policy).toBe(false);
  });
});

describe("computeSessionKey", () => {
  const p = resolveEditorProfile({ preset: "full" });

  it("相同输入 sessionKey 幂等", () => {
    expect(computeSessionKey(p, "full", "zh-CN", MOCK_CAPS)).toBe(
      computeSessionKey(p, "full", "zh-CN", MOCK_CAPS),
    );
  });

  it("不同 locale 产生不同 sessionKey", () => {
    expect(computeSessionKey(p, "full", "zh-CN", MOCK_CAPS)).not.toBe(
      computeSessionKey(p, "full", "en-US", MOCK_CAPS),
    );
  });
});

describe("mergeFeatures", () => {
  it("features[key]=undefined 不覆盖 preset 默认值", () => {
    expect(mergeFeatures(PRESET_DEFAULT_FEATURES.full, { table: undefined }).table).toBe(true);
  });

  it("features[key]=false 覆盖 preset 默认值", () => {
    expect(mergeFeatures(PRESET_DEFAULT_FEATURES.full, { table: false }).table).toBe(false);
  });
});

describe("resolveInlineGates", () => {
  it("Inline toolbar.link=true → gates.link=true", () => {
    expect(resolveInlineGates({ link: true }, MOCK_CAPS)["inline-link"]).toBe(true);
  });

  it("Inline toolbar.link 未传 → gate 关闭（opt-in）", () => {
    expect(resolveInlineGates({}, MOCK_CAPS)["inline-link"]).toBe(false);
  });
});
