import { describe, it, expect } from "vitest";

import { renderMath } from "./renderMath";

describe("renderMath", () => {
  it("空公式返回占位文案且不报错", () => {
    const result = renderMath("   ", false, undefined, "空公式");
    expect(result.error).toBeNull();
    expect(result.html).toContain("空公式");
  });

  it("合法公式渲染出 KaTeX 结构", () => {
    const result = renderMath("x^2", false, undefined, "空公式");
    expect(result.error).toBeNull();
    expect(result.html).toContain("katex");
  });

  /** 缺省 throwOnError:false 时 KaTeX 自己就地渲染错误，不抛错 */
  it("缺省配置下非法公式不抛错", () => {
    const result = renderMath("\\unknowncmd", false, undefined, "空公式");
    expect(result.error).toBeNull();
  });

  /**
   * 回归：错误状态曾被写进组件的 ref，模板一旦切到错误分支就再不求值预览 computed，
   * 于是错误永远清不掉。纯函数没有跨调用状态——同一个函数先错后对必须如实反映。
   */
  it("先失败后成功时，错误不会粘住", () => {
    const opts = { throwOnError: true };
    const bad = renderMath("\\unknowncmd", false, opts, "空公式");
    expect(bad.error).toBeTruthy();

    const good = renderMath("x^2", false, opts, "空公式");
    expect(good.error).toBeNull();
    expect(good.html).toContain("katex");
  });

  /** KaTeX 的报错文案里带用户输入，而该 HTML 会进 v-html */
  it("错误 HTML 里的用户输入被转义", () => {
    const result = renderMath("\\q<img src=x onerror=alert(1)>", false, { throwOnError: true }, "");
    expect(result.error).toBeTruthy();
    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("&lt;img");
  });

  it("非字符串 latex 按空公式处理，不抛异常", () => {
    const result = renderMath(123, false, undefined, "空公式");
    expect(result.error).toBeNull();
    expect(result.html).toContain("空公式");
  });

  it("占位文案本身也被转义", () => {
    const result = renderMath("", false, undefined, "<b>x</b>");
    expect(result.html).not.toContain("<b>");
  });
});
