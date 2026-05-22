/**
 * Tiptap 编辑器多语言类型定义
 *
 * 命名约定：
 * - editor.*       UI 标签、按钮、占位符、aria 文案
 * - messages.*     Toast / 通知类反馈（成功、失败、警告）
 * - placeholder.*  编辑器内容区占位符
 * - stats.*        状态栏统计与缩放
 * - table.*        表格上下文菜单
 * - slashCommand.* 斜杠命令 / 块选择菜单
 * - dragMenu.*     拖拽手柄块菜单
 * - codeBlock.*    代码块控件
 * - aiSettings.*   AI 设置弹窗
 */

export type LocaleCode = "zh-CN" | "en-US";

export interface TiptapLocale {
  table: {
    insertTable: string;
    deleteTable: string;
    addColumnBefore: string;
    addColumnAfter: string;
    deleteColumn: string;
    addRowBefore: string;
    addRowAfter: string;
    deleteRow: string;
    mergeCells: string;
    splitCell: string;
    toggleHeaderCell: string;
    toggleHeaderColumn: string;
    toggleHeaderRow: string;
    setCellAttribute: string;
    fixTables: string;
  };

  dragMenu: {
    duplicateBlock: string;
    deleteBlock: string;
    transformTo: string;
  };

  codeBlock: {
    language: string;
    selectLanguage: string;
    exitCodeBlock: string;
  };

  stats: {
    characters: string;
    words: string;
    pages: string;
    resetZoom: string;
    total: string;
  };

  placeholder: {
    heading: string;
    /** 默认段落占位（basic / full 等非斜杠命令场景） */
    paragraph: string;
    /** 启用斜杠命令时的段落占位（notion preset） */
    paragraphWithSlash: string;
    codeBlock: string;
  };

  messages: {
    imageUploadFailed: string;
    imageUploadSuccess: string;
    invalidImageFormat: string;
    imageTooLarge: string;
    networkError: string;
    pasteCleanedUp: string;
    linkRequired: string;
    linkInvalid: string;
    translationFailed: string;
    polishFailed: string;
    summarizeFailed: string;
    continueWritingFailed: string;
    customAiFailed: string;
    wordImportSuccess: string;
    wordExportSuccess: string;
    wordImportFailed: string;
    wordExportFailed: string;
    imageUploadNotConfigured: string;
    videoUploadNotConfigured: string;
  };

  editor: {
    paragraph: string;
    heading: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;

    bold: string;
    italic: string;
    underline: string;
    strikethrough: string;
    inlineCode: string;
    superscript: string;
    subscript: string;

    bulletList: string;
    orderedList: string;
    taskList: string;

    align: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignJustify: string;

    colors: string;
    textColor: string;
    backgroundColor: string;
    defaultColors: string;
    standardColors: string;
    showAdvanced: string;
    hideAdvanced: string;
    clearColor: string;

    undo: string;
    redo: string;
    clearFormat: string;
    formatPainter: string;

    fontFamily: string;
    fontSize: string;
    lineHeight: string;

    insertLink: string;
    insertImage: string;
    insertTable: string;
    insertCodeBlock: string;
    image: string;
    link: string;
    editLink: string;
    openLink: string;
    removeLink: string;
    linkPlaceholder: string;
    imagePlaceholder: string;

    deleteTable: string;
    includeHeader: string;

    localUpload: string;
    localUploadImage: string;
    webUpload: string;
    clickOrDragUpload: string;
    onlySupportImage: string;
    localUploadVideo: string;
    uploadVideo: string;
    onlySupportVideo: string;

    word: string;
    importWord: string;
    exportWord: string;
    clickOrDragUploadWord: string;
    onlySupportDocx: string;
    importing: string;
    exporting: string;
    exportFilenamePlaceholder: string;

    ai: string;

    formatPainterSelectTextFirst: string;
    formatPainterSelectTextHint: string;
    formatPainterDoubleClickSelect: string;
    formatPainterAppliedOnce: string;
    formatPainterAppliedMulti: string;
    formatPainterExited: string;
    formatPainterDisabled: string;

    findReplace: string;
    findReplaceTitle: string;
    findPlaceholder: string;
    replacePlaceholder: string;
    findNext: string;
    findPrev: string;
    replaceOnce: string;
    replaceAll: string;
    findReplaceMatchCase: string;

    outlineToggle: string;
    outlineTitle: string;
    outlineEmpty: string;
    outlineClose: string;

    toolbarLabel: string;
    toolbarSectionHistory: string;
    toolbarSectionTypography: string;
    toolbarSectionParagraph: string;
    toolbarSectionInsert: string;
    toolbarSectionDocument: string;
    toolbarSectionTools: string;
    toolbarSectionAssistant: string;
    statusBarShortcutHints: string;
    statusBarShortcutHintsTitle: string;
    officePasteImageTitle: string;
    officePasteImageBody: string;

    enterValidLink: string;

    math: string;
    mathInline: string;
    mathBlock: string;
    mathPlaceholder: string;
    mathEmpty: string;

    insertTemplate: string;
    templateMeetingMinutes: string;
    templateMeetingMinutesDesc: string;
    templateWeeklyReport: string;
    templateWeeklyReportDesc: string;
    templateDailyReport: string;
    templateDailyReportDesc: string;
    templateProjectPlan: string;
    templateProjectPlanDesc: string;
    templateProductRequirement: string;
    templateProductRequirementDesc: string;

    imageGallery: string;
    galleryEmpty: string;
    galleryEmptyHint: string;
    galleryCount: string;
    galleryInsert: string;

    continueWriting: string;
    polish: string;
    summarize: string;
    translate: string;
    translateTo: string;
    customAi: string;
    selectLanguage: string;

    aiSuggestion: string;
    aiContinueWriting: string;
    originalText: string;
    suggestedText: string;
    generatedContent: string;
    generating: string;
    selectedContent: string;
    pleaseSelectText: string;
    continueWritingRequiresSelection: string;
    polishRequiresSelection: string;
    summarizeRequiresSelection: string;
    translateRequiresSelection: string;
    customAiRequiresSelection: string;
    aiPromptPlaceholder: string;
    customAiCommand: string;
    execute: string;
    cancel: string;
    reject: string;
    accept: string;

    lang: {
      "zh-CN": string;
      "zh-TW": string;
      zh: string;
      en: string;
      ja: string;
      th: string;
      fr: string;
      es: string;
      pt: string;
      ko: string;
      vi: string;
      ru: string;
      de: string;
      hi: string;
      id: string;
      ar: string;
    };
  };

  slashCommand: {
    noResults: string;
    basicBlocks: string;
    lists: string;
    notionBlocks: string;
    advanced: string;
    paragraph: string;
    paragraphDesc: string;
    heading1: string;
    heading1Desc: string;
    heading2: string;
    heading2Desc: string;
    heading3: string;
    heading3Desc: string;
    bulletList: string;
    bulletListDesc: string;
    orderedList: string;
    orderedListDesc: string;
    taskList: string;
    taskListDesc: string;
    toggleBlock: string;
    toggleBlockDesc: string;
    callout: string;
    calloutDesc: string;
    columnLayout: string;
    columnLayoutDesc: string;
    embed: string;
    embedDesc: string;
    embedUrlPrompt: string;
    mention: string;
    mentionDesc: string;
    mentionNoResults: string;
    blockquote: string;
    blockquoteDesc: string;
    codeBlock: string;
    codeBlockDesc: string;
    table: string;
    tableDesc: string;
    image: string;
    imageDesc: string;
    imageUrlPrompt: string;
    video: string;
    videoDesc: string;
    videoUrlPrompt: string;
    math: string;
    mathDesc: string;
    horizontalRule: string;
    horizontalRuleDesc: string;
  };

  aiSettings: {
    title: string;
    provider: string;
    apiKeyPlaceholder: string;
    apiKeyHint: string;
    endpoint: string;
    model: string;
    enableAi: string;
    testConnection: string;
    testing: string;
    testSuccess: string;
    testFailed: string;
    viewDocs: string;
    save: string;
    cancel: string;
    clearConfig: string;
  };
}

export type TranslationKey = string;
export type TranslationFunction = (key: string, params?: Record<string, any>) => string;
