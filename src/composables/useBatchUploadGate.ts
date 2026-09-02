import type { Ref } from "vue";

/**
 * 批量上传的关闭闸门：整批结束且至少一个成功才关弹窗。
 *
 * antd 的 `<a-upload-dragger multiple>` 对每个文件各调一次 `customRequest` 且并发发起，
 * 「成功即关」会在第一个文件完成时关掉，其余仍在后台上传并继续往文档插内容。
 * 依据见 `useBatchUploadGate.test.ts`（约定 29）。
 */
export function useBatchUploadGate(open: Ref<boolean>) {
  let inFlight = 0;
  let anySucceeded = false;

  return {
    /** 每次 `customRequest` 进入时调用 */
    begin(): void {
      inFlight += 1;
    },
    /** 单个文件成功时调用 */
    markSuccess(): void {
      anySucceeded = true;
    },
    /** 放在 `finally` 里：本批全部结束且有成功者时关闭弹窗 */
    end(): void {
      inFlight -= 1;
      if (inFlight > 0) return;
      if (anySucceeded) open.value = false;
      anySucceeded = false;
    },
  };
}
