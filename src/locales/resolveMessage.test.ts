import { describe, expect, it } from "vitest";

import { interpolate, resolveMessage } from "./resolveMessage";
import { zhCN } from "./zh-CN";

import type { TiptapLocale } from "./types";

/**
 * `resolveMessage` 现在是全仓库唯一的 dot-path 取词实现，四个调用点共用
 * （`manager.t()`、`useEditorLocale`、registry 的 AI 与 dragHandle 两处）。
 * 行为一旦漂移会同时影响这四处，因此契约在此钉死。
 */
describe("resolveMessage", () => {
  it("按 dot-path 取到叶子文案", () => {
    expect(resolveMessage(zhCN, "editor.bold")).toBe(zhCN.editor.bold);
  });

  it("未命中返回 undefined —— 而不是回退成 key", () => {
    expect(resolveMessage(zhCN, "editor.definitelyMissing")).toBeUndefined();
    expect(resolveMessage(zhCN, "nope.at.all")).toBeUndefined();
  });

  /**
   * 这正是旧实现的问题：`manager.t()` 拿「返回值 === key」当未命中哨兵，
   * 于是自定义语言包里「译文恰好等于 key」的条目会被误判为没查到，继续往下查内置包。
   */
  it("译文恰好等于 key 时仍算命中", () => {
    const pack = { editor: { bold: "editor.bold" } } as unknown as TiptapLocale;
    expect(resolveMessage(pack, "editor.bold")).toBe("editor.bold");
  });

  it("叶子不是字符串（中途停在对象上）返回 undefined", () => {
    expect(resolveMessage(zhCN, "editor")).toBeUndefined();
  });

  it("空语言包安全", () => {
    expect(resolveMessage(null, "editor.bold")).toBeUndefined();
    expect(resolveMessage(undefined, "editor.bold")).toBeUndefined();
  });

  it("不会经原型链取到 Object 自带成员", () => {
    for (const key of ["constructor", "toString", "editor.constructor", "editor.toString"]) {
      expect(resolveMessage(zhCN, key), `${key} 不应解析出值`).toBeUndefined();
    }
  });

  it("路径穿过字符串时不继续下钻", () => {
    expect(resolveMessage(zhCN, "editor.bold.length")).toBeUndefined();
  });
});

describe("interpolate", () => {
  it("替换已提供的占位符", () => {
    expect(interpolate("共 {total} 张，已选 {selected} 张", { total: 3, selected: 1 })).toBe(
      "共 3 张，已选 1 张",
    );
  });

  it("没有 params 时原样返回", () => {
    expect(interpolate("翻译为 {lang}")).toBe("翻译为 {lang}");
  });

  it("未提供的占位符保留原样，便于暴露漏传", () => {
    expect(interpolate("{a} / {b}", { a: "1" })).toBe("1 / {b}");
  });

  it("参数值里的占位符不会被二次替换", () => {
    // 旧的「逐个 param 依次 replace」写法会把 a 的值里的 {b} 再替换成 2
    expect(interpolate("{a}", { a: "{b}", b: "2" })).toBe("{b}");
  });

  it("同一占位符出现多次全部替换", () => {
    expect(interpolate("{n}-{n}", { n: 7 })).toBe("7-7");
  });
});
