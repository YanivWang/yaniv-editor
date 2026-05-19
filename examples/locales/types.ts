export interface DemoMessages {
  demo: {
    appTitle: string;
    subtitle: {
      fullEditor: string;
      inlinePlugins: string;
    };
    nav: {
      fullEditor: string;
      inlinePlugins: string;
    };
    navAriaLabel: string;
    theme: {
      dark: string;
      light: string;
      switchToDark: string;
      switchToLight: string;
    };
    themePreset: {
      word: string;
      notion: string;
      github: string;
      typora: string;
    };
    locale: {
      enUS: string;
      zhCN: string;
      zhTW: string;
    };
    inline: {
      sampleContent: string;
      emptyToolbar: string;
      stats: string;
      pluginsActive: string;
      panel: {
        title: string;
        allOn: string;
        allOff: string;
      };
      presets: {
        minimal: string;
        writer: string;
        standard: string;
        full: string;
      };
      plugins: Record<
        string,
        {
          name: string;
          description: string;
        }
      >;
    };
  };
}
