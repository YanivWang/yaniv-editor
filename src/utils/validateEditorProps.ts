import type { TiptapProEditorProps } from "@/core/editorTypes";

/** 宿主集成时的轻量校验（不抛出，避免打断业务渲染） */
export function validateTiptapProEditorProps(props: TiptapProEditorProps): void {
  const warn = typeof console?.warn === "function" ? console.warn.bind(console) : () => {};

  const zone = `[yaniv-editor]`;

  if (props.version && !["basic", "advanced", "premium"].includes(props.version)) {
    warn(
      `${zone} Unrecognized props.version="${props.version}". Expected basic | advanced | premium.`,
    );
  }

  const placement = props.zoomBarPlacement;
  if (placement && placement !== "bottom" && placement !== "belowToolbar") {
    warn(
      `${zone} Invalid zoomBarPlacement="${String(placement)}". Expected bottom | belowToolbar.`,
    );
  }
}
