/// <reference types="vite/client" />

/**
 * 通用 UI 基元（与编辑器业务解耦）
 * @description 工具栏按钮、分割线、下拉触发器等；导入别名：`@/base`。
 * 绑定 TipTap Editor 的控件见 `@/editor`。
 */
export { default as ToolbarButton } from "./ToolbarButton.vue";
export { default as ToolbarGroup } from "./ToolbarGroup.vue";
export { default as ToolbarDivider } from "./ToolbarDivider.vue";
export { default as ToolbarDropdownButton } from "./ToolbarDropdownButton.vue";
