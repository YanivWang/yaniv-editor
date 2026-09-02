import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：退订编辑器事件时，不得在退订函数里「就地取当前编辑器」。
 *
 * `watch(editor, cb)` 的回调触发时 `editor.value` **已经是新实例**。若退订函数体内自己
 * 去读 `editor.value` / `toValue(editor)` / `props.editor`，`off()` 就全打在刚换上的实例上
 * （那上面还没有监听），旧实例的监听一个也摘不掉——组件早已不再使用它，回调却还在跑。
 *
 * 正确写法是让被退订的编辑器**从外面进来**：
 * - `watch(editor, (e, _p, onCleanup) => { e.on(...); onCleanup(() => e.off(...)); })`
 *   （`HeadingControl` / `useControlledContent` / `ZoomBar`，闭包捕获的是**当次**实例）——**首选**
 * - 或 `watch(editor, (next, prev) => { detach(prev); attach(next); })`（`OutlinePanel`），
 *   但这种写法只覆盖「换实例」，**不覆盖「组件卸载」**，必须另配 `onBeforeUnmount` 退订；
 *   见本文件末尾的第二条护栏。
 *
 * 历史事故：同一形状一次性存在 4 处——`UndoRedoButton`（还叠加了摘不掉的匿名 `create`
 * 监听与 `nextTick` 造成的重复订阅）、`FormatPainterButton`、`useEditorColorState`、
 * `CodeBlockLanguageBadge`（后者写了 `if (prev) unbind()`，看着用了 prev，
 * 实际 `unbind()` 内部读的仍是 `editor.value`）。对应 ARCHITECTURE 不变量 24。
 */
const EDITOR_EVENT_OFF = /\.off\(\s*["'](?:update|selectionUpdate|transaction|create|destroy)["']/;

/** 「就地取当前编辑器」的三种写法 */
const LIVE_EDITOR_READ = /=\s*(?:editor\.value\b|toValue\(\s*editor\s*\)|props\.editor\b)/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "testing") collectSourceFiles(full, out);
    } else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** 具名函数声明与赋给常量的箭头函数，两种写法都要扫 */
const FUNCTION_HEAD =
  /(?:function\s+(\w+)\s*\([^)]*\)\s*(?::[^{]*?)?|const\s+(\w+)\s*=\s*\([^)]*\)\s*(?::[^=]*?)?=>\s*)\{/g;

/** 从 `{` 处按花括号配平截出函数体 */
function readBody(text: string, openBrace: number): string {
  let depth = 0;
  for (let i = openBrace; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openBrace, i + 1);
    }
  }
  return text.slice(openBrace);
}

interface FunctionSpan {
  name: string;
  start: number;
  end: number;
  body: string;
}

export function findUnscopedDetach(text: string): string[] {
  FUNCTION_HEAD.lastIndex = 0;

  const withOff: FunctionSpan[] = [];
  let head: RegExpExecArray | null;
  while ((head = FUNCTION_HEAD.exec(text)) !== null) {
    const openBrace = head.index + head[0].length - 1;
    const body = readBody(text, openBrace);
    if (!EDITOR_EVENT_OFF.test(body)) continue;
    withOff.push({
      name: head[1] ?? head[2] ?? "<anonymous>",
      start: openBrace,
      end: openBrace + body.length,
      body,
    });
  }

  /**
   * 只看**最内层**那个退订函数。
   *
   * 外层的 composable / setup 整体也包含 `.off(`，同时往往在别处（兄弟函数里）
   * 合法地读过一次 `editor.value`——不剔除外层就会误报。
   */
  const innermost = withOff.filter(
    (fn) => !withOff.some((other) => other !== fn && other.start > fn.start && other.end <= fn.end),
  );

  return innermost.filter((fn) => LIVE_EDITOR_READ.test(fn.body)).map((fn) => fn.name);
}

/**
 * 静态护栏之二：**组件**订阅了编辑器事件，就必须把退订挂在生命周期上。
 *
 * `watch(editor, (next, prev) => { detach(prev); attach(next) })` 只在**换实例**时退订。
 * 组件被卸载时 watcher 只是停止，回调不会再跑，监听于是永远留在那个还活着的编辑器上。
 *
 * 这条在 `ZoomBar` 上真实发生过：底栏在 `mode` 切到 preview 时卸载
 * （`resolveChromePolicy` 的 `showFooter`），而 `computeSessionKey` 不含 mode，
 * 编辑器并不重建——实测 edit↔preview 每来回一次，监听数 4 → 6 → 8 单调增长，
 * 每个残留的 `updateCounts` 还在跟着每次按键跑。
 *
 * 只判 `.vue`：节点视图与 manager（`resizableImage` / `aiSuggestionManager`）
 * 的生命周期由 ProseMirror / 调用方的 `destroy()` 负责，不走 Vue 钩子。
 */
const EDITOR_EVENT_ON = /\.on\(\s*["'](?:update|selectionUpdate|transaction|create|destroy)["']/;
const LIFECYCLE_TEARDOWN =
  /\bonCleanup\s*\(|\bonBeforeUnmount\s*\(|\bonUnmounted\s*\(|\bonScopeDispose\s*\(/;

export function findUnboundedSubscription(file: string, text: string): string[] {
  if (!file.endsWith(".vue")) return [];
  if (!EDITOR_EVENT_ON.test(text)) return [];
  if (LIFECYCLE_TEARDOWN.test(text)) return [];
  return [`${file} — 订阅了编辑器事件但没有任何随生命周期触发的退订`];
}

describe("退订编辑器事件不得就地取当前实例", () => {
  test("全仓无违规", () => {
    const findings = collectSourceFiles("src").flatMap((file) =>
      findUnscopedDetach(readFileSync(file, "utf8")).map((fn) => `${file}: ${fn}()`),
    );

    expect(findings).toEqual([]);
  });

  test("扫描器能认出违规写法（护栏自检）", () => {
    // 与 useEditorColorState / UndoRedoButton 修复前同形
    const broken = `
      function cleanupEditorSubscriptions() {
        const e = toValue(editor);
        if (!e) return;
        e.off("selectionUpdate", sync);
        e.off("transaction", sync);
      }
    `;
    expect(findUnscopedDetach(broken)).toEqual(["cleanupEditorSubscriptions"]);

    // 正确写法：被退订的编辑器由参数传入
    const fixed = `
      function detachEditorListeners(e) {
        if (!e) return;
        e.off("selectionUpdate", sync);
        e.off("transaction", sync);
      }
    `;
    expect(findUnscopedDetach(fixed)).toEqual([]);

    // 正确写法：onCleanup 闭包捕获当次实例
    const viaCleanup = `
      const stop = (e, prev, onCleanup) => {
        e.on("transaction", sync);
        onCleanup(() => e.off("transaction", sync));
      };
    `;
    expect(findUnscopedDetach(viaCleanup)).toEqual([]);
  });
});

describe("组件订阅编辑器事件必须绑定生命周期", () => {
  test("全仓无违规", () => {
    const findings = collectSourceFiles("src").flatMap((file) =>
      findUnboundedSubscription(file, readFileSync(file, "utf8")),
    );

    expect(findings).toEqual([]);
  });

  test("扫描器认得出漏挂生命周期的组件（护栏自检）", () => {
    // 与 ZoomBar 修复前同形：只处理 oldEditor，卸载时无人退订
    const broken = `
      watch(editor, (ed, oldEditor) => {
        if (oldEditor) detach(oldEditor);
        if (ed) ed.on("update", sync);
      }, { immediate: true });
    `;
    expect(findUnboundedSubscription("Probe.vue", broken)).toHaveLength(1);

    // onCleanup 覆盖换实例 + 卸载
    const viaCleanup = `
      watch(editor, (e, _p, onCleanup) => {
        e.on("update", sync);
        onCleanup(() => e.off("update", sync));
      });
    `;
    expect(findUnboundedSubscription("Probe.vue", viaCleanup)).toEqual([]);

    // 显式卸载钩子也算数
    const viaUnmount = `
      watch(editor, (ed, oldEditor) => { detach(oldEditor); ed?.on("update", sync); });
      onBeforeUnmount(() => detach(editorAtSubscribeTime));
    `;
    expect(findUnboundedSubscription("Probe.vue", viaUnmount)).toEqual([]);

    // 非组件文件不判（节点视图 / manager 走各自的 destroy）
    expect(findUnboundedSubscription("nodeView.ts", broken)).toEqual([]);
  });
});

/**
 * 静态护栏之三：同一个 handler 不得同时订阅 `transaction` 与 `update` / `selectionUpdate`。
 *
 * 实测（tiptap 3）三个事件的覆盖关系：
 *
 * | 场景          | transaction | update | selectionUpdate |
 * | ------------- | ----------: | -----: | --------------: |
 * | 插入文本      |           1 |      1 |               1 |
 * | 只改选区      |           1 |      0 |               1 |
 * | toggleBold    |           1 |      1 |               0 |
 * | 纯 meta 事务  |           1 |      0 |               0 |
 * | `setEditable` |       **0** |      1 |               0 |
 *
 * 也就是说 `transaction` 是另两者的超集，**唯一**的例外是 `setEditable`——它不产生事务，
 * 只 emit `update`。所以「同一个 handler 既订 transaction 又订 update/selectionUpdate」
 * 的写法，在除 `setEditable` 外的**每一次**编辑里都会让这个 handler 白跑一到两遍。
 *
 * 这不是理论洁癖：`OutlinePanel` 三个都订，于是每次按键 `syncItems` 跑 3 次，
 * 每次都对所有标题 `getBoundingClientRect()`——三倍的强制回流。同型一次性存在 9 处
 * （`OutlinePanel` / `FormatPainterButton` / `useEditorColorState` 各 3 个事件，
 * `UndoRedoButton` / `HeadingControl` / `FontFamilySelect` / `FontSizeSelect` /
 * `CodeBlockLanguageBadge` / `ZoomBar` 各 2 个）。
 *
 * 真需要覆盖 `setEditable` 时，用**另一个** handler 单独订 `update`
 * （`UndoRedoButton` 的 `handleUpdate` 就是这样），规则因此可以写成绝对的。
 * 对应 ARCHITECTURE 不变量 37。
 */
const SUPERSET_EVENT = "transaction";
const SUBSET_EVENTS = ["update", "selectionUpdate"] as const;

/** 只认具名 handler：匿名箭头函数无法比较身份，且另有护栏管它们摘不掉的问题 */
const EVENT_ON_CALL = /\.on\(\s*["'](update|selectionUpdate|transaction)["']\s*,\s*(\w+)\s*\)/g;

export function findRedundantSubscription(text: string): string[] {
  EVENT_ON_CALL.lastIndex = 0;

  const byHandler = new Map<string, Set<string>>();
  let match: RegExpExecArray | null;
  while ((match = EVENT_ON_CALL.exec(text)) !== null) {
    const [, event, handler] = match;
    const events = byHandler.get(handler) ?? new Set<string>();
    events.add(event);
    byHandler.set(handler, events);
  }

  const findings: string[] = [];
  for (const [handler, events] of byHandler) {
    if (!events.has(SUPERSET_EVENT)) continue;
    const redundant = SUBSET_EVENTS.filter((event) => events.has(event));
    if (redundant.length > 0) {
      findings.push(`${handler} 同时订阅了 transaction 与 ${redundant.join(" / ")}`);
    }
  }
  return findings;
}

describe("同一 handler 不得重复订阅 transaction 的子集事件", () => {
  test("全仓无违规", () => {
    const findings = collectSourceFiles("src").flatMap((file) =>
      findRedundantSubscription(readFileSync(file, "utf8")).map((hit) => `${file}: ${hit}`),
    );

    expect(findings).toEqual([]);
  });

  test("扫描器认得出重复订阅（护栏自检）", () => {
    // 与 OutlinePanel / FormatPainterButton / useEditorColorState 修复前同形
    const triple = `
      e.on("transaction", syncItems);
      e.on("update", syncItems);
      e.on("selectionUpdate", syncItems);
    `;
    expect(findRedundantSubscription(triple)).toEqual([
      "syncItems 同时订阅了 transaction 与 update / selectionUpdate",
    ]);

    // 与 HeadingControl / FontSizeSelect 修复前同形
    const pair = `
      e.on("selectionUpdate", sync);
      e.on("transaction", sync);
    `;
    expect(findRedundantSubscription(pair)).toEqual([
      "sync 同时订阅了 transaction 与 selectionUpdate",
    ]);

    // 收敛后的写法
    expect(findRedundantSubscription(`e.on("transaction", sync);`)).toEqual([]);

    // 用**另一个** handler 覆盖 setEditable 是正当写法（UndoRedoButton 就是这样）
    const withEditable = `
      e.on("update", handleUpdate);
      e.on("transaction", updateUndoRedoState);
    `;
    expect(findRedundantSubscription(withEditable)).toEqual([]);

    // 只订 update（ZoomBar：字数只随文档变）也不该报
    expect(findRedundantSubscription(`ed.on("update", updateCounts);`)).toEqual([]);
  });
});
