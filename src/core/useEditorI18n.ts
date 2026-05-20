import { toRef } from "vue";

import { useEditorLocale } from "./useEditorLocale";

import type { YanivEditorProps } from "./editorTypes";

export function useEditorI18n(props: YanivEditorProps) {
  return useEditorLocale(toRef(props, "locale"));
}
