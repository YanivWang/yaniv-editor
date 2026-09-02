import { describe, expect, test } from "vitest";

import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";
import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";

import { applyGatesToToolbarConfig } from "./applyGatesToToolbarConfig";
import { CAPABILITIES } from "./registry";

/**
 * 静态护栏：每个 `fullToolbarSlugs` 都必须映射到一个**真实存在**的 gate。
 *
 * `applyGatesToToolbarConfig` 用 `gates[cap.featureKey ?? cap.id] === true` 收敛工具栏，
 * 而 `ExtensionGates` 的类型是 `Required<FeatureConfig> & Record<string, boolean>`——
 * 那个索引签名让**任何**字符串都能通过类型检查。于是 gateKey 拼错、
 * 或者新加的 capability 忘了在 `FeatureConfig` 里登记 featureKey，
 * `gates[gateKey]` 就是 `undefined`，`=== true` 恒为 false，
 * 该 capability 的工具栏按钮**在所有 preset 下都不显示**——不报错、不警告。
 *
 * 同一个 slug 被多个 capability 用不同 gateKey 声明也要拦：
 * `buildToolbarGateMap` 只保留先注册的那个，后者被静默忽略。
 */
const GATE_KEYS = new Set(Object.keys(resolveEditorProfile({ preset: "notion" }).gates));

interface SlugBinding {
  slug: string;
  gateKey: string;
  capId: string;
}

function collectToolbarBindings(): SlugBinding[] {
  const out: SlugBinding[] = [];
  for (const cap of CAPABILITIES) {
    if (!cap.fullToolbarSlugs?.length) continue;
    const gateKey = cap.featureKey ?? cap.id;
    for (const slug of cap.fullToolbarSlugs) out.push({ slug, gateKey, capId: cap.id });
  }
  return out;
}

describe("工具栏 slug → gate 映射", () => {
  const bindings = collectToolbarBindings();

  test("护栏没空跑", () => {
    expect(bindings.length).toBeGreaterThan(5);
    expect(GATE_KEYS.size).toBeGreaterThan(5);
  });

  test("每个 gateKey 都真实存在于 gates（否则按钮永远隐藏）", () => {
    const missing = bindings
      .filter((b) => !GATE_KEYS.has(b.gateKey))
      .map((b) => `${b.capId}: slug "${b.slug}" → 不存在的 gate "${b.gateKey}"`);
    expect(missing).toEqual([]);
  });

  test("同一个 slug 不得被多个 capability 用不同 gateKey 声明", () => {
    const byslug = new Map<string, string>();
    const conflicts: string[] = [];
    for (const b of bindings) {
      const prev = byslug.get(b.slug);
      if (prev !== undefined && prev !== b.gateKey) {
        conflicts.push(`slug "${b.slug}"：${prev} vs ${b.gateKey}（cap ${b.capId}）`);
      }
      if (prev === undefined) byslug.set(b.slug, b.gateKey);
    }
    expect(conflicts).toEqual([]);
  });

  test("gate 关闭时对应按钮确实被收敛掉", () => {
    // 逐个 slug 验证映射真的生效，而不只是「键存在」
    for (const { slug, gateKey } of bindings) {
      const base = { [slug]: true } as unknown as ToolbarToolsConfig;
      const on = applyGatesToToolbarConfig(base, {
        [gateKey]: true,
      } as unknown as ReturnType<typeof resolveEditorProfile>["gates"]);
      const off = applyGatesToToolbarConfig(base, {
        [gateKey]: false,
      } as unknown as ReturnType<typeof resolveEditorProfile>["gates"]);
      expect(on[slug as keyof ToolbarToolsConfig], `${slug} 在 gate 开启时应保留`).toBe(true);
      expect(off[slug as keyof ToolbarToolsConfig], `${slug} 在 gate 关闭时应收敛`).toBe(false);
    }
  });

  test("basic preset 下 table / video 按钮被 gate 收敛", () => {
    const { gates } = resolveEditorProfile({ preset: "basic" });
    const result = applyGatesToToolbarConfig({ table: true, video: true, image: true }, gates);
    expect(result.table).toBe(false);
    expect(result.video).toBe(false);
    // basic 默认开 image，按钮应保留
    expect(result.image).toBe(true);
  });

  test("features 覆盖能把按钮放回来", () => {
    const { gates } = resolveEditorProfile({ preset: "basic", features: { table: true } });
    const result = applyGatesToToolbarConfig({ table: true }, gates);
    expect(result.table).toBe(true);
  });
});
