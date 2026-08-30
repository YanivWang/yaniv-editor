import { defineAsyncComponent, defineComponent } from "vue";

import type { AsyncComponentLoader, Component } from "vue";

/**
 * 加载失败时的占位：**必须存在**，且必须渲染成空。
 *
 * 没有 `errorComponent` 时，`fail()` 会把错误继续往外抛，在宿主里表现为未捕获错误
 * （实测：vitest 里直接让整个测试文件以退出码 1 结束）。门控按钮加载失败应当是
 * "这个按钮不出现"，而不是"把宿主的错误上报打爆"——诊断已经由 onError 打出来了。
 */
const EmptyPlaceholder = defineComponent({
  name: "YanivGatedAsyncFallback",
  render: () => null,
});

/**
 * 门控组件的异步加载包装：唯一职责是在 chunk 加载失败时留下可排障的诊断。
 *
 * 能力按 gate 代码分割之后多出了一个此前不存在的失败模式：`import()` 拿不到 chunk。
 * 线上最常见的成因是**部署更新后旧页面请求已被替换掉的 hash 文件**
 * （`Failed to fetch dynamically imported module`），其次是 CDN 回源失败。
 *
 * Vue 的 `defineAsyncComponent` 在这种情况下只是渲染空，生产构建里没有任何提示——
 * 接入方看到的现象是"某个工具栏按钮莫名其妙不见了"，无从查起。
 * 而本库在 terser 配置里特意保留了 `console.warn` / `console.error`，
 * 理由正是"运行时诊断信息对接入方排障有价值"（见 vite.config.ts）；
 * 静默失败与那条决定是矛盾的，这里补齐。
 *
 * 只做记录、不做重试：重试会改变加载时序，而上面两种成因重试也救不回来
 * （文件确实不存在了），刷新页面才是正解——诊断信息里因此直接给出这个建议。
 */
export function defineGatedAsyncComponent<T extends Component>(
  displayName: string,
  loader: AsyncComponentLoader<T>,
) {
  return defineAsyncComponent({
    loader,
    errorComponent: EmptyPlaceholder,
    onError(error, _retry, fail) {
      console.error(
        `[yaniv-editor] 门控组件 ${displayName} 的 chunk 加载失败，该功能在本次会话中不会出现。` +
          `常见成因：部署更新后旧页面请求了已被替换的 hash 文件，刷新页面即可恢复。`,
        error,
      );
      fail();
    },
  });
}
