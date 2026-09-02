import { describe, it, expect } from "vitest";

import { parseSize } from "./mediaSize";

describe("parseSize", () => {
  it("解析正整数", () => {
    expect(parseSize("320")).toBe(320);
    expect(parseSize("320px")).toBe(320);
  });

  it("非数值一律视为没有尺寸，不产生 NaN", () => {
    for (const raw of ["abc", "auto", "", "  ", null, undefined]) {
      const value = parseSize(raw);
      expect(value).toBeNull();
      expect(Number.isNaN(value as unknown as number)).toBe(false);
    }
  });

  it("零与负数视为没有尺寸", () => {
    expect(parseSize("0")).toBeNull();
    expect(parseSize("-10")).toBeNull();
  });
});
