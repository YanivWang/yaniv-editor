import {
  CheckSquareOutlined,
  CodeOutlined,
  ColumnWidthOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  FunctionOutlined,
  InfoCircleOutlined,
  LineOutlined,
  LinkOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RightOutlined,
  TableOutlined,
  UnorderedListOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons-vue";

import type { ExtensionGates } from "@/core/runtime/types";

import type { BlockMenuGroupDef, BlockMenuGroupId, BlockMenuItemId } from "./types";
import type { Schema } from "@tiptap/pm/model";
import type { Component } from "vue";

export type BlockMenuFeatureGates = Pick<ExtensionGates, "table" | "image" | "video" | "math">;

interface BlockMenuItemSource {
  id: BlockMenuItemId;
  group: BlockMenuGroupId;
  titleKey: string;
  descKey: string;
  icon: Component;
  keywords: string[];
}

const BLOCK_MENU_ITEMS: BlockMenuItemSource[] = [
  {
    id: "paragraph",
    group: "basicBlocks",
    titleKey: "paragraph",
    descKey: "paragraphDesc",
    icon: FileTextOutlined,
    keywords: ["paragraph", "text", "plain", "正文", "段落", "p"],
  },
  {
    id: "heading1",
    group: "basicBlocks",
    titleKey: "heading1",
    descKey: "heading1Desc",
    icon: FontSizeOutlined,
    keywords: ["heading", "h1", "标题", "一级标题", "title"],
  },
  {
    id: "heading2",
    group: "basicBlocks",
    titleKey: "heading2",
    descKey: "heading2Desc",
    icon: FontSizeOutlined,
    keywords: ["heading", "h2", "标题", "二级标题", "subtitle"],
  },
  {
    id: "heading3",
    group: "basicBlocks",
    titleKey: "heading3",
    descKey: "heading3Desc",
    icon: FontSizeOutlined,
    keywords: ["heading", "h3", "标题", "三级标题"],
  },
  {
    id: "bulletList",
    group: "lists",
    titleKey: "bulletList",
    descKey: "bulletListDesc",
    icon: UnorderedListOutlined,
    keywords: ["bullet", "list", "unordered", "无序列表", "列表", "ul"],
  },
  {
    id: "orderedList",
    group: "lists",
    titleKey: "orderedList",
    descKey: "orderedListDesc",
    icon: OrderedListOutlined,
    keywords: ["ordered", "list", "number", "有序列表", "编号列表", "ol"],
  },
  {
    id: "taskList",
    group: "lists",
    titleKey: "taskList",
    descKey: "taskListDesc",
    icon: CheckSquareOutlined,
    keywords: ["task", "todo", "checklist", "任务列表", "待办", "checkbox"],
  },
  {
    id: "toggleBlock",
    group: "notionBlocks",
    titleKey: "toggleBlock",
    descKey: "toggleBlockDesc",
    icon: RightOutlined,
    keywords: ["toggle", "collapse", "折叠", "toggle list"],
  },
  {
    id: "callout",
    group: "notionBlocks",
    titleKey: "callout",
    descKey: "calloutDesc",
    icon: InfoCircleOutlined,
    keywords: ["callout", "alert", "标注", "提示"],
  },
  {
    id: "columnLayout",
    group: "notionBlocks",
    titleKey: "columnLayout",
    descKey: "columnLayoutDesc",
    icon: ColumnWidthOutlined,
    keywords: ["column", "columns", "分栏", "layout"],
  },
  {
    id: "embed",
    group: "notionBlocks",
    titleKey: "embed",
    descKey: "embedDesc",
    icon: LinkOutlined,
    keywords: ["embed", "bookmark", "link", "嵌入", "书签"],
  },
  {
    id: "mention",
    group: "notionBlocks",
    titleKey: "mention",
    descKey: "mentionDesc",
    icon: UserOutlined,
    keywords: ["mention", "page", "@", "提及", "页面链接"],
  },
  {
    id: "blockquote",
    group: "advanced",
    titleKey: "blockquote",
    descKey: "blockquoteDesc",
    icon: LineOutlined,
    keywords: ["quote", "blockquote", "引用", "引述", "citation"],
  },
  {
    id: "codeBlock",
    group: "advanced",
    titleKey: "codeBlock",
    descKey: "codeBlockDesc",
    icon: CodeOutlined,
    keywords: ["code", "block", "代码块", "代码", "pre"],
  },
  {
    id: "table",
    group: "advanced",
    titleKey: "table",
    descKey: "tableDesc",
    icon: TableOutlined,
    keywords: ["table", "表格", "grid"],
  },
  {
    id: "image",
    group: "advanced",
    titleKey: "image",
    descKey: "imageDesc",
    icon: PictureOutlined,
    keywords: ["image", "picture", "图片", "图像", "img", "photo"],
  },
  {
    id: "video",
    group: "advanced",
    titleKey: "video",
    descKey: "videoDesc",
    icon: VideoCameraOutlined,
    keywords: ["video", "media", "视频", "媒体", "mp4"],
  },
  {
    id: "math",
    group: "advanced",
    titleKey: "math",
    descKey: "mathDesc",
    icon: FunctionOutlined,
    keywords: ["math", "formula", "latex", "公式", "数学"],
  },
  {
    id: "horizontalRule",
    group: "advanced",
    titleKey: "horizontalRule",
    descKey: "horizontalRuleDesc",
    icon: MinusOutlined,
    keywords: ["divider", "hr", "horizontal", "rule", "分割线", "水平线"],
  },
];

const GROUP_ORDER: BlockMenuGroupId[] = ["basicBlocks", "lists", "notionBlocks", "advanced"];

const GROUP_TITLE_KEYS: Record<BlockMenuGroupId, string> = {
  basicBlocks: "slashCommand.basicBlocks",
  lists: "slashCommand.lists",
  notionBlocks: "slashCommand.notionBlocks",
  advanced: "slashCommand.advanced",
};

const FEATURE_REQUIREMENTS: Partial<Record<BlockMenuItemId, keyof BlockMenuFeatureGates>> = {
  table: "table",
  image: "image",
  video: "video",
  math: "math",
};

const NODE_REQUIREMENTS: Partial<Record<BlockMenuItemId, string>> = {
  toggleBlock: "toggleBlock",
  callout: "callout",
  columnLayout: "columnLayout",
  embed: "embed",
  mention: "mention",
};

function isBlockMenuItemAvailable(
  item: BlockMenuItemSource,
  gates?: BlockMenuFeatureGates,
  schema?: Schema,
) {
  const requiredFeature = FEATURE_REQUIREMENTS[item.id];
  if (requiredFeature && gates?.[requiredFeature] !== true) return false;

  const requiredNode = NODE_REQUIREMENTS[item.id];
  if (requiredNode && schema && !schema.nodes[requiredNode]) return false;

  return true;
}

export function getBlockMenuGroups(
  gates: BlockMenuFeatureGates | undefined,
  translate: (key: string) => string,
  schema?: Schema,
): BlockMenuGroupDef[] {
  return GROUP_ORDER.map((groupId) => ({
    id: groupId,
    title: translate(GROUP_TITLE_KEYS[groupId]),
    items: BLOCK_MENU_ITEMS.filter(
      (item) => item.group === groupId && isBlockMenuItemAvailable(item, gates, schema),
    ).map((item) => ({
      id: item.id,
      group: item.group,
      title: translate(`slashCommand.${item.titleKey}`),
      description: translate(`slashCommand.${item.descKey}`),
      icon: item.icon,
      keywords: [...item.keywords],
    })),
  })).filter((group) => group.items.length > 0);
}
