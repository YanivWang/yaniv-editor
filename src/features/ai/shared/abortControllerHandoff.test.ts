/**
 * 换流时必须取消上一个流。
 *
 * `aiSuggestionManager` 是模块级单例，`setAbortController` 此前直接覆盖：
 * 同一个编辑器上连做两次 AI 操作时 `show()` 不会 abort（`ensureEditor` 对同一实例
 * 直接返回），第一个流的 controller 被覆盖后再也无人能取消——它继续消耗 API 配额，
 * `onToken` 还在往同一个单例里 `updateSuggestion()`，两个流的文本互相覆盖。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { aiSuggestionManager } from "./aiSuggestionManager";

describe("setAbortController 的接管语义", () => {
  it("换成另一个 controller 时取消上一个", () => {
    const first = new AbortController();
    const second = new AbortController();

    aiSuggestionManager.setAbortController(first);
    expect(first.signal.aborted).toBe(false);

    aiSuggestionManager.setAbortController(second);
    expect(first.signal.aborted, "第一个流应被取消").toBe(true);
    expect(second.signal.aborted, "新流不该被取消").toBe(false);

    aiSuggestionManager.setAbortController(null);
  });

  it("传 null 是「流已结束」，不该 abort", () => {
    const controller = new AbortController();
    aiSuggestionManager.setAbortController(controller);
    aiSuggestionManager.setAbortController(null);
    expect(controller.signal.aborted).toBe(false);
  });

  it("重复传同一个 controller 不自我取消", () => {
    const controller = new AbortController();
    aiSuggestionManager.setAbortController(controller);
    aiSuggestionManager.setAbortController(controller);
    expect(controller.signal.aborted).toBe(false);
    aiSuggestionManager.setAbortController(null);
  });
});

/**
 * 静态护栏：流结束时清句柄必须按身份（`clearAbortController(自己那个)`），
 * 不得用 `setAbortController(null)`。
 *
 * 两者在「只有一个流」时效果相同，差别只在换流的那一瞬：新流设句柄会 abort 旧流，
 * 旧流随后以 `AbortError` 走 `onError` 并在那里清句柄——此刻句柄已经是新流的，
 * 无条件清空等于把新流的取消能力一起扔掉（实测：用户再点「取消」毫无反应，
 * 新流继续消耗配额并往单例写建议文本）。
 *
 * 这个坑踩过两次：第一次修的是 `setAbortController` 的接管语义（换流要 abort 旧的），
 * 但 `runStream` 里的**清理**语义没跟上，同一个仓库里留下了两套写法
 * ——`executeCustomPrompt` 是对的，`runStream` 不是。所以钉成护栏。
 */
const SOURCE_ROOT = resolve(__dirname, "../../..");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "testing" ? [] : listSourceFiles(path);
    if (!/\.(ts|vue)$/.test(entry.name) || entry.name.endsWith(".test.ts")) return [];
    return [path];
  });
}

/** 先掩掉注释：上面那段说明里就写着这个调用形态 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function findUnconditionalClears(source: string): string[] {
  return [...stripComments(source).matchAll(/setAbortController\(\s*null\s*\)/g)].map(
    (match) => match[0],
  );
}

describe("流结束时清句柄的写法", () => {
  it("源码里不得出现 setAbortController(null)", () => {
    const offenders = listSourceFiles(SOURCE_ROOT).flatMap((file) => {
      const hits = findUnconditionalClears(readFileSync(file, "utf8"));
      return hits.length > 0 ? [`${file.slice(SOURCE_ROOT.length + 1)}（${hits.length} 处）`] : [];
    });

    expect(offenders).toEqual([]);
  });

  it("自检：扫描器认得出这个形态，也不会把注释算进去", () => {
    expect(findUnconditionalClears("manager.setAbortController(null);")).toHaveLength(1);
    expect(findUnconditionalClears("manager.setAbortController( null )")).toHaveLength(1);
    expect(findUnconditionalClears("// setAbortController(null)")).toHaveLength(0);
    expect(findUnconditionalClears("/* setAbortController(null) */")).toHaveLength(0);
    expect(findUnconditionalClears("manager.clearAbortController(controller);")).toHaveLength(0);
  });
});
