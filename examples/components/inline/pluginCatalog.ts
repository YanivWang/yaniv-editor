import {
  AlignLeftOutlined,
  BoldOutlined,
  ClearOutlined,
  CodeOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UndoOutlined,
} from "@ant-design/icons-vue";

import type { InlineToolbarPlugin, InlineToolbarPreset } from "./types";

const pluginIconColors = [
  "#e0f2fe",
  "#dbeafe",
  "#cffafe",
  "#ccfbf1",
  "#d1fae5",
  "#ecfccb",
  "#fef3c7",
  "#e0e7ff",
] as const;

export function createDefaultPlugins(): InlineToolbarPlugin[] {
  return [
    { id: "undoRedo", enabled: true, color: pluginIconColors[0], iconComponent: UndoOutlined },
    { id: "heading", enabled: true, color: pluginIconColors[1], iconComponent: FontColorsOutlined },
    { id: "textFormat", enabled: true, color: pluginIconColors[2], iconComponent: BoldOutlined },
    { id: "fontSize", enabled: false, color: pluginIconColors[3], iconComponent: FontSizeOutlined },
    { id: "list", enabled: true, color: pluginIconColors[4], iconComponent: OrderedListOutlined },
    { id: "align", enabled: false, color: pluginIconColors[5], iconComponent: AlignLeftOutlined },
    { id: "link", enabled: false, color: pluginIconColors[6], iconComponent: LinkOutlined },
    { id: "codeBlock", enabled: false, color: pluginIconColors[7], iconComponent: CodeOutlined },
    { id: "formatClear", enabled: false, color: pluginIconColors[0], iconComponent: ClearOutlined },
  ];
}

export const inlineToolbarPresets: InlineToolbarPreset[] = [
  { id: "minimal", icon: "1", plugins: ["undoRedo", "textFormat"] },
  { id: "writer", icon: "2", plugins: ["undoRedo", "heading", "textFormat", "list"] },
  {
    id: "standard",
    icon: "3",
    plugins: ["undoRedo", "heading", "textFormat", "fontSize", "list", "align", "link"],
  },
  {
    id: "full",
    icon: "4",
    plugins: [
      "undoRedo",
      "heading",
      "textFormat",
      "fontSize",
      "list",
      "align",
      "link",
      "codeBlock",
      "formatClear",
    ],
  },
];
