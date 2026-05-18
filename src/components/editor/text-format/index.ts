/**
 * Text Format Components - 文本格式组件统一导出
 */
export { default as TextFormatButtons } from "./TextFormatButtons.vue";

// 类型导出（向后兼容）
// 注意：所有文本格式相关的类型已统一迁移到 `@/configs/toolbarTypes`
// 建议新代码直接从 `@/configs/toolbarTypes` 导入，以获得更好的类型一致性
export type { TextFormatType, TextFormatConfig } from "@/configs/toolbarTypes";
