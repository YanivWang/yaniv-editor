import type { YanivEditorProps } from "@/core/editorTypes";

/** 宿主集成时的轻量校验（不抛出，避免打断业务渲染） */
export function validateYanivEditorProps(props: YanivEditorProps): void {
  const warn = typeof console?.warn === "function" ? console.warn.bind(console) : () => {};

  const zone = `[Yaniv Editor]`;

  const placement = props.zoomBarPlacement;
  if (placement && placement !== "bottom" && placement !== "belowToolbar") {
    warn(
      `${zone} Invalid zoomBarPlacement="${String(placement)}". Expected bottom | belowToolbar.`,
    );
  }
}
