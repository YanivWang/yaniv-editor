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

export function provideBlockMenuHost(): BlockMenuHost {
  const instanceRef = shallowRef<BlockMenuInstance | null>(null);

  const host: BlockMenuHost = {
    registerInstance(inst) {
      instanceRef.value = inst;
    },
    activate(state) {
      instanceRef.value?.activate(state);
    },
    openInsert(context) {
      instanceRef.value?.openInsert(context);
    },
    hide() {
      instanceRef.value?.hide();
    },
    updateQuery(query) {
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
