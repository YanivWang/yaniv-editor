# Upstream issue draft — `unplugin-dts` non-deterministic `declare module` order

**Status:** not filed yet. Repo: <https://github.com/qmhc/unplugin-dts> (author: qmhc).
Reproduced against `unplugin-dts@1.1.0` (latest on 2026-09-05), reached here via
`vite-plugin-dts@5.0.3`.

**Why this file exists:** we work around it locally with
`sortAmbientModuleBlocksPlugin()` in `vite.config.ts`. That workaround should be
deleted the moment upstream lands a fix — so the analysis lives next to it.

To file it:

```bash
gh issue create --repo qmhc/unplugin-dts --title "Bundled .d.ts is non-deterministic: declare module blocks are collected from concurrent callbacks" --body-file docs/upstream-issue-unplugin-dts.md
```

---

## Title

Bundled `.d.ts` is non-deterministic: `declare module` blocks are collected from concurrent callbacks

## Body

### Summary

When `bundleTypes` is enabled, the ambient `declare module "..."` blocks appended to the
bundled `.d.ts` come out in a **different order on different runs of the same build**, from
the same source tree, on the same machine. The content is identical — only the block order
changes — so nothing breaks at type-check time, but the emitted artifact is not
reproducible byte-for-byte.

This matters for anyone who verifies releases by comparing a rebuild against the published
tarball. In our case it was the only thing standing between a rebuild and a byte-identical
match: 231/237 files matched, and the 6 that didn't were `.d.ts`/`.d.cts` files whose only
difference was the order of these blocks (sorting both sides by line made them equal).
Two consecutive local builds also differed from each other, which ruled out any
environmental cause on our side.

### Cause

`dist/shared/unplugin-dts.<hash>.mjs`, two places:

```js
// ~L1852 — inside the runParallel callback
declareModules.push(...result.declareModules);
```

```js
// ~L2046 — appended verbatim to every bundled .d.ts
const declared = declareModules.join("\n");
```

`declareModules` is a module-scoped array written from callbacks that run concurrently, so
the push order is **completion order**, not input order. File size, disk cache and CPU
scheduling decide it, which is why it changes between runs.

### Suggested fix

`runParallel` already returns results in input order — it pushes the promises in order and
resolves them with `Promise.all`:

```js
async function runParallel(maxConcurrency, source, iteratorFn) {
  const ret = [];
  // ...
  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source));
    ret.push(p); // <- input order
    // ...
  }
  return Promise.all(ret); // <- resolves in input order
}
```

So the shared array isn't needed. Have the callback return its blocks and flatten the
result:

```js
-        declareModules.push(...result.declareModules);
+        // (return it from the callback instead of pushing)

-  await runParallel(cpus().length, Array.from(declarationFiles.entries()), async ([filePath, content]) => {
-    // ...
-  });
+  const perFileDeclareModules = await runParallel(
+    cpus().length,
+    Array.from(declarationFiles.entries()),
+    async ([filePath, content]) => {
+      // ...
+      return result?.declareModules ?? [];
+    }
+  );
+  const declareModules = perFileDeclareModules.flat();
```

That makes the order a deterministic function of `declarationFiles` iteration order (a
`Map`, so insertion-ordered) with no behaviour change and no extra sorting pass.

If you'd rather not touch the concurrency path, sorting `declareModules` before `join`
would also make it deterministic — but it changes the emitted order relative to today's
"whatever finished first", whereas the change above preserves the intended source order.

### Reproduction

Any project with `bundleTypes` enabled and **more than one** file contributing a
`declare module` block. Build twice, clean in between, and diff the emitted `.d.ts`:

```bash
rm -rf dist && npm run build && cp dist/index.d.ts /tmp/a.d.ts
rm -rf dist && npm run build && cp dist/index.d.ts /tmp/b.d.ts
diff /tmp/a.d.ts /tmp/b.d.ts                       # differs
diff <(sort /tmp/a.d.ts) <(sort /tmp/b.d.ts)       # identical
```

The second diff being empty is the tell: same content, different block order.

### Environment

|                |                                      |
| -------------- | ------------------------------------ |
| `unplugin-dts` | 1.1.0 (latest at time of writing)    |
| reached via    | `vite-plugin-dts@5.0.3`              |
| node           | 22.23.2                              |
| OS             | macOS (Darwin 27.0.0), Apple Silicon |

Happy to open a PR with the change above if you'd like.
