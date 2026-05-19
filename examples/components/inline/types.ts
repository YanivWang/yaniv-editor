import type { Component } from "vue";

export interface InlineToolbarPlugin {
  id: string;
  enabled: boolean;
  color: string;
  iconComponent?: Component;
  iconSvg?: string;
}

export interface InlineToolbarPluginView extends InlineToolbarPlugin {
  name: string;
  description: string;
}

export interface InlineToolbarPreset {
  id: string;
  icon: string;
  plugins: string[];
}

export interface InlineToolbarPresetView extends InlineToolbarPreset {
  label: string;
}
