import type { TiptapLocale } from "./types";

export const zhCN: TiptapLocale = {
  toolbar: {
    // 文本格式
    bold: "粗体",
    italic: "斜体",
    underline: "下划线",
    strikethrough: "删除线",
    code: "代码",
    subscript: "下标",
    superscript: "上标",

    // 清除格式
    clear: "清除",
    clearFormat: "清除格式",
    formatPainter: "格式刷",

    // 标题
    heading: "标题",
    heading1: "标题1",
    heading2: "标题2",
    heading3: "标题3",
    heading4: "标题4",
    heading5: "标题5",
    heading6: "标题6",
    paragraph: "正文",

    // 字体
    fontFamily: "字体",
    fontSize: "字号",
    lineHeight: "行距",

    // 颜色
    textColor: "文字颜色",
    backgroundColor: "背景颜色",
    highlightColor: "高亮颜色",

    // 列表
    bulletList: "无序列表",
    orderedList: "有序列表",
    taskList: "任务列表",
    indent: "增加缩进",
    outdent: "减少缩进",

    // 对齐
    alignLeft: "左对齐",
    alignCenter: "居中对齐",
    alignRight: "右对齐",
    alignJustify: "两端对齐",

    // 插入
    insertLink: "插入链接",
    insertImage: "插入图片",
    insertTable: "插入表格",
    insertCodeBlock: "插入代码块",
    insertHorizontalRule: "插入分隔线",

    // 链接
    link: "链接",
    linkUrl: "链接地址",
    linkText: "链接文本",
    openLink: "打开链接",
    editLink: "编辑链接",
    removeLink: "移除链接",

    // 撤销重做
    undo: "撤销",
    redo: "重做",

    // 更多
    more: "更多",
  },

  table: {
    insertTable: "插入表格",
    deleteTable: "删除表格",
    addColumnBefore: "在左侧插入列",
    addColumnAfter: "在右侧插入列",
    deleteColumn: "删除列",
    addRowBefore: "在上方插入行",
    addRowAfter: "在下方插入行",
    deleteRow: "删除行",
    mergeCells: "合并单元格",
    splitCell: "拆分单元格",
    toggleHeaderCell: "切换表头单元格",
    toggleHeaderColumn: "切换表头列",
    toggleHeaderRow: "切换表头行",
    setCellAttribute: "设置单元格属性",
    fixTables: "修复表格",
  },

  dragMenu: {
    delete: "删除",
    duplicate: "复制",
    copy: "拷贝",
    cut: "剪切",
    moveUp: "上移",
    moveDown: "下移",
  },

  codeBlock: {
    language: "语言",
    selectLanguage: "选择语言",
    exitCodeBlock: "退出代码块",
  },

  stats: {
    characters: "字符",
    words: "词",
    pages: "页",
    zoom: "缩放",
    reset: "重置",
    total: "共",
  },

  placeholder: {
    default: "请输入内容...",
    heading: "标题",
    paragraph: "输入文本或输入 '/' 唤起命令",
    codeBlock: "输入代码",
  },

  messages: {
    imageUploadFailed: "图片上传失败",
    imageUploadSuccess: "图片上传成功",
    invalidImageFormat: "不支持的图片格式",
    imageTooLarge: "图片大小超过限制",
    networkError: "网络错误，请稍后重试",
    pasteCleanedUp: "已清理粘贴内容的格式",
    linkRequired: "请输入链接地址",
    linkInvalid: "链接地址无效",
    // AI 功能错误消息
    translationFailed: "翻译失败",
    polishFailed: "润色失败",
    summarizeFailed: "总结失败",
    continueWritingFailed: "续写失败",
    customAiFailed: "自定义 AI 失败",
  },

  editor: {
    // 标题快捷方式
    h1: "标题1",
    h2: "标题2",
    h3: "标题3",
    h4: "标题4",
    h5: "标题5",
    h6: "标题6",
    paragraph: "正文",
    heading: "标题",
    heading1: "标题1",
    heading2: "标题2",
    heading3: "标题3",
    heading4: "标题4",
    heading5: "标题5",
    heading6: "标题6",

    // 文本格式
    bold: "粗体",
    italic: "斜体",
    underline: "下划线",
    strike: "删除线",
    inlineCode: "代码",
    superscript: "上标",
    subscript: "下标",

    // 列表
    bulletList: "无序列表",
    orderedList: "有序列表",
    taskList: "任务列表",

    // 对齐
    align: "对齐",
    alignLeft: "左对齐",
    alignCenter: "居中对齐",
    alignRight: "右对齐",
    alignJustify: "两端对齐",

    // 缩进
    indent: "增加缩进",
    outdent: "减少缩进",
    indentAndAlign: "缩进和对齐",

    // 颜色
    colors: "颜色",
    text: "文字",
    highlight: "高亮",
    textColor: "文字颜色",
    backgroundColor: "背景颜色",
    defaultColors: "默认颜色",
    standardColors: "标准色",
    showAdvanced: "高级选择器",
    hideAdvanced: "收起",
    clearColor: "清空颜色",

    // 操作
    actions: "操作",
    cut: "剪切",
    copy: "拷贝",
    delete: "删除",

    // 基础操作
    undo: "撤销",
    redo: "重做",
    clearFormat: "清除格式",
    formatPainter: "格式刷",

    // 字体
    font: "字体",
    fontSize: "字号",
    lineHeight: "行距",

    // 插入
    insertLink: "插入链接",
    insertImage: "插入图片",
    insertTable: "插入表格",
    image: "图片",
    link: "链接",
    editLink: "编辑链接",
    openLink: "打开链接",
    removeLink: "移除链接",
    linkPlaceholder: "请输入链接地址",
    imagePlaceholder: "请输入图片地址",

    // 表格
    deleteTable: "删除表格",
    includeHeader: "包含表头",

    // 上传
    localUpload: "本地上传",
    localUploadImage: "本地上传图片",
    webUpload: "网络上传",
    clickOrDragUpload: "点击或拖拽文件到此区域上传",
    onlySupportImage: "仅支持图片格式",
    video: "视频",
    localUploadVideo: "本地上传视频",
    uploadVideo: "上传视频",
    onlySupportVideo: "仅支持视频格式",
    supportImageAndVideo: "支持图片和视频格式",

    // Word 导入/导出
    word: "Word",
    importWord: "导入 Word",
    exportWord: "导出 Word",
    clickOrDragUploadWord: "点击或拖拽 Word 文件到此区域",
    onlySupportDocx: "仅支持 .docx 格式",
    importing: "正在导入...",
    exporting: "正在导出...",
    exportFilenamePlaceholder: "请输入文件名",
    importSuccess: "Word 文件导入成功",
    exportSuccess: "Word 文件导出成功",
    importFailed: "Word 文件导入失败",
    exportFailed: "Word 文件导出失败",

    // 更多
    more: "更多",
    aiTool: "AI 工具",
    ai: "AI",

    // 格式刷相关
    pleaseSelectTextToSample: "请先选择要采样的文本",
    pleaseSelectTextToSampleShort: "请先选择文本",
    pleaseSelectTextToSampleDouble: "请先双击选择要采样的文本",
    sampleSuccessSingle: "格式采样成功，点击目标文本应用格式",
    sampleSuccessContinuous: "格式采样成功，可连续点击多个目标文本应用格式",
    formatPainterExited: "已退出格式刷模式",
    formatPainterDisabled: "当前不可使用格式刷功能",

    // 查找替换
    findReplace: "查找与替换",
    findReplaceTitle: "查找与替换",
    findPlaceholder: "查找",
    replacePlaceholder: "替换为",
    findNext: "下一处",
    findPrev: "上一处",
    replaceOnce: "替换",
    replaceAll: "全部替换",
    caseSensitiveShort: "区分大小写",

    // 大纲
    outlineToggle: "文档大纲",
    outlineTitle: "大纲",
    outlineEmpty: "暂无标题，插入 H1–H6 标题后将自动生成大纲。",
    outlineClose: "关闭大纲",

    toolbarLabel: "编辑器工具栏",
    toolbarSectionHistory: "编辑",
    toolbarSectionTypography: "字体",
    toolbarSectionParagraph: "段落",
    toolbarSectionInsert: "插入",
    toolbarSectionDocument: "文档",
    toolbarSectionTools: "工具",
    toolbarSectionAssistant: "智能助手",
    statusBarShortcutHints: "⌘/Ctrl+F 查找 · ⌘/Ctrl+B 加粗 · ⌘/Ctrl+I 斜体 · ⌘/Ctrl+Z 撤销",
    statusBarShortcutHintsTitle:
      "常用快捷键因操作系统略有差异：查找、加粗、斜体、撤销/重做等可在菜单提示中查看。",
    officePasteImageTitle: "检测到来自 Office/WPS 的含图粘贴",
    officePasteImageBody:
      "图片已按占位处理，或由剪贴 HTML 决定是否保留样式。若需在文档中嵌入原图，请使用「插入图片」单独上传或使用 Word 导出为图片较少的内容再粘贴。",

    // 链接相关
    enterValidLink: "请输入有效的链接地址",

    // 数学公式
    math: "数学公式",
    mathInline: "行内公式",
    mathBlock: "块级公式",
    mathPlaceholder: "输入 LaTeX 公式...",
    mathEmpty: "点击编辑公式",

    // 模板插入
    insertTemplate: "插入模板",
    templateMeetingMinutes: "会议纪要",
    templateMeetingMinutesDesc: "包含议题、决议、待办事项的会议记录模板",
    templateWeeklyReport: "周报",
    templateWeeklyReportDesc: "本周完成、进行中、下周计划的周报模板",
    templateDailyReport: "日报",
    templateDailyReportDesc: "今日完成与明日计划的日报模板",
    templateProjectPlan: "项目方案",
    templateProjectPlanDesc: "项目概述、实施方案、风险评估的项目文档模板",
    templateProductRequirement: "需求文档",
    templateProductRequirementDesc: "产品需求文档 (PRD) 模板",

    // 图库
    imageGallery: "图库",
    galleryEmpty: "暂无图片",
    galleryEmptyHint: "当前文档中还没有插入过图片",
    galleryCount: "共 {total} 张，已选 {selected} 张",
    galleryInsert: "插入选中图片",

    // AI 相关
    continueWriting: "继续写作",
    polish: "润色文本",
    summarize: "总结内容",
    translate: "翻译",
    translateTo: "翻译为 {lang}",
    customAi: "自定义 AI",
    selectLanguage: "选择语言",

    // AI 建议相关
    aiSuggestion: "AI 建议",
    aiContinueWriting: "AI 续写：",
    originalText: "原文：",
    suggestedText: "建议：",
    generatedContent: "生成内容：",
    generating: "正在生成...",
    selectedContent: "选中内容：",
    currentStatus: "当前状态",
    noTextSelected: "未选中文本，AI 内容将插入到光标位置",
    // AI 功能提示信息
    pleaseSelectText: "请先选中文字",
    continueWritingRequiresSelection: "续写功能需要先选中要续写的文字",
    polishRequiresSelection: "润色功能需要先选中要润色的文字",
    summarizeRequiresSelection: "总结功能需要先选中要总结的文字",
    translateRequiresSelection: "翻译功能需要先选中要翻译的文字",
    customAiRequiresSelection: "自定义AI功能需要先选中要处理的文字",
    aiPrompt: "AI 指令",
    aiPromptPlaceholder: "请输入 AI 指令，例如：优化这段文字、翻译成英文...",
    customAiCommand: "自定义 AI 指令",
    execute: "执行",
    cancel: "取消",
    reject: "拒绝",
    accept: "接受",

    // 语言代码
    lang: {
      "zh-CN": "简体中文",
      "zh-TW": "繁体中文",
      zh: "中文",
      en: "英语",
      ja: "日语",
      th: "泰语",
      fr: "法语",
      es: "西班牙语",
      pt: "葡萄牙语",
      ko: "韩语",
      vi: "越南语",
      ru: "俄语",
      de: "德语",
      hi: "印地语",
      id: "印尼语",
      ar: "阿拉伯语",
    },
  },

  slashCommand: {
    noResults: "无匹配结果",
    basicBlocks: "基础块",
    lists: "列表",
    advanced: "高级",
    paragraph: "正文",
    paragraphDesc: "普通文本段落",
    heading1: "标题 1",
    heading1Desc: "大标题",
    heading2: "标题 2",
    heading2Desc: "中标题",
    heading3: "标题 3",
    heading3Desc: "小标题",
    bulletList: "无序列表",
    bulletListDesc: "创建无序列表",
    orderedList: "有序列表",
    orderedListDesc: "创建有序编号列表",
    taskList: "任务列表",
    taskListDesc: "创建待办事项列表",
    blockquote: "引用",
    blockquoteDesc: "插入引用块",
    codeBlock: "代码块",
    codeBlockDesc: "插入代码片段",
    table: "表格",
    tableDesc: "插入 3×3 表格",
    image: "图片",
    imageDesc: "通过链接插入图片",
    imageUrlPrompt: "请输入图片链接",
    video: "视频",
    videoDesc: "通过链接插入视频",
    videoUrlPrompt: "请输入视频链接",
    math: "公式",
    mathDesc: "插入块级数学公式",
    horizontalRule: "分割线",
    horizontalRuleDesc: "插入水平分割线",
  },

  aiSettings: {
    title: "AI 设置",
    provider: "AI 提供商",
    apiKeyPlaceholder: "请输入 API Key",
    apiKeyHint: "API Key 仅保存在本地浏览器中，不会上传到服务器",
    endpoint: "API 端点",
    model: "模型",
    enableAi: "启用 AI 功能",
    testConnection: "测试连接",
    testing: "测试中...",
    testSuccess: "连接成功",
    testFailed: "连接失败",
    viewDocs: "查看文档",
    save: "保存",
    cancel: "取消",
    clear: "清除配置",
  },
};

export default zhCN;
