import { useOverlayMountTarget } from "@/composables/useOverlayMount";
import {
  showOverlayNotice,
  showOverlayToast,
  type OverlayFeedbackKind,
  type OverlayNoticeOptions,
  type OverlayToastOptions,
} from "@/core/overlayFeedback";

export interface OverlayFeedbackApi {
  toast: (content: string, kind?: OverlayFeedbackKind, duration?: number) => void;
  notice: (options: OverlayNoticeOptions) => void;
  showToast: (options: OverlayToastOptions) => void;
}

/** Vue 组件内反馈：挂载到当前 EditorShell overlay portal */
export function useOverlayFeedback(): OverlayFeedbackApi {
  const getMountTarget = useOverlayMountTarget();

  return {
    toast(content, kind = "info", duration) {
      showOverlayToast(getMountTarget.value(), { content, kind, duration });
    },
    notice(options) {
      showOverlayNotice(getMountTarget.value(), options);
    },
    showToast(options) {
      showOverlayToast(getMountTarget.value(), options);
    },
  };
}
