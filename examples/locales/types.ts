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
    autoDemo: {
      play: string;
      stop: string;
      replay: string;
    };
    device: {
      desktop: string;
      tablet: string;
      mobile: string;
    };
    inline: {
      title: string;
      subtitle: string;
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
    landing: {
      hero: {
        subtitle: string;
        starGithub: string;
        openSource: string;
        tryDemo: string;
        viewGithub: string;
      };
      stats: {
        themes: string;
        features: string;
        languages: string;
        free: string;
      };
      features: {
        title: string;
        themes: {
          title: string;
          description: string;
        };
        ai: {
          title: string;
          description: string;
        };
        darkMode: {
          title: string;
          description: string;
        };
        wordMode: {
          title: string;
          description: string;
        };
        i18n: {
          title: string;
          description: string;
        };
      };
      themes: {
        title: string;
        subtitle: string;
        word: { name: string; description: string };
        notion: { name: string; description: string };
        github: { name: string; description: string };
        typora: { name: string; description: string };
        default: { name: string; description: string };
      };
      tech: {
        title: string;
      };
      cta: {
        title: string;
        subtitle: string;
        copyTitle: string;
        tryDemo: string;
      };
      footer: {
        text: string;
        github: string;
        issues: string;
        license: string;
      };
    };
  };
}
