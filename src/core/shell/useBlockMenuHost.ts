import { inject, provide, shallowRef, type InjectionKey } from "vue";

import type { BlockInsertContext } from "@/components/tools/block-menu/types";
import type { SlashCommandState } from "@/components/tools/slash-command";

export interface BlockMenuInstance {
  activate: (state: SlashCommandState) => void;
  openInsert: (context: BlockInsertContext) => void;
  hide: () => void;
  updateQuery: (query: string) => void;
}

export interface BlockMenuHost {
  registerInstance: (instance: BlockMenuInstance | null) => void;
  activate: (state: SlashCommandState) => void;
  openInsert: (context: BlockInsertContext) => void;
  hide: () => void;
  updateQuery: (query: string) => void;
}

export const blockMenuHostKey: InjectionKey<BlockMenuHost> = Symbol("blockMenuHost");

type PendingOpen =
  { kind: "activate"; state: SlashCommandState } | { kind: "insert"; context: BlockInsertContext };

export function provideBlockMenuHost(): BlockMenuHost {
  const instanceRef = shallowRef<BlockMenuInstance | null>(null);

  /**
   * 实例注册前到达的打开请求要缓冲一次，注册后立刻补投。
   *
   * `BlockPickerMenu` 是 `defineAsyncComponent`（门控能力不进主 chunk），
   * 它的 chunk 解析完成之前实例是 null。此时若用户已经敲下 `/` 或点了 + 号，
   * 旧实现直接丢弃该请求，菜单不会弹出——用户得再敲一次才生效。
   * 只保留最后一次请求：菜单是单例浮层，早于它的请求已无意义。
   */
  let pendingOpen: PendingOpen | null = null;

  const host: BlockMenuHost = {
    registerInstance(inst) {
      instanceRef.value = inst;
      if (!inst || !pendingOpen) return;

      const queued = pendingOpen;
      pendingOpen = null;
      if (queued.kind === "activate") inst.activate(queued.state);
      else inst.openInsert(queued.context);
    },
    activate(state) {
      if (!instanceRef.value) {
        pendingOpen = { kind: "activate", state };
        return;
      }
      instanceRef.value.activate(state);
    },
    openInsert(context) {
      if (!instanceRef.value) {
        pendingOpen = { kind: "insert", context };
        return;
      }
      instanceRef.value.openInsert(context);
    },
    hide() {
      pendingOpen = null;
      instanceRef.value?.hide();
    },
    updateQuery(query) {
      // 实例尚未就绪时无需缓冲：注册后补投的 activate 已携带最新 query
      instanceRef.value?.updateQuery(query);
    },
  };

  provide(blockMenuHostKey, host);
  return host;
}

export function useBlockMenuHost(): BlockMenuHost {
  const host = inject(blockMenuHostKey);
  if (!host) {
    throw new Error("[useBlockMenuHost] must be used within EditorShell");
  }
  return host;
}
