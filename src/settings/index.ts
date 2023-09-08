import { plug } from 'src/main';
import { SettingsTab } from './SettingsTab';
import store from './store';

type StyleOption = 'solid' | 'gradient';
export type BannerDragModOption = 'None' | 'Shift' | 'Ctrl' | 'Alt' | 'Meta';

export interface BannerSettings {
  height: number;
  mobileHeight: number;
  style: StyleOption;
  showInInternalEmbed: boolean;
  internalEmbedHeight: number;
  showInPopover: boolean;
  popoverHeight: number;
  bannerDragModifier: BannerDragModOption;
  frontmatterField: string;
  enableDragInInternalEmbed: boolean;
  enableDragInPopover: boolean;
}

const TEXT_SETTINGS: Array<keyof BannerSettings> = ['frontmatterField'];

export const DEFAULT_SETTINGS: BannerSettings = {
  height: 300,
  mobileHeight: 180,
  style: 'solid',
  showInInternalEmbed: true,
  internalEmbedHeight: 200,
  showInPopover: true,
  popoverHeight: 120,
  bannerDragModifier: 'None',
  frontmatterField: 'banner',
  enableDragInInternalEmbed: false,
  enableDragInPopover: false
};

const STYLE_OPTION_LABELS: Record<StyleOption, string> = {
  solid: 'Solid',
  gradient: 'Gradient'
} as const;

const BANNER_DRAG_MOD_OPION_LABELS: Record<BannerDragModOption, string> = {
  None: 'None',
  Shift: '⇧ Shift',
  Ctrl: '⌃ Ctrl',
  Alt: '⎇ Alt',
  Meta: '⌘ Meta'
} as const;

export const SELECT_OPTIONS_MAP: Record<string, Record<string, string>> = {
  style: STYLE_OPTION_LABELS,
  bannerDragModifier: BANNER_DRAG_MOD_OPION_LABELS
};

/* NOTE: The `value` parameter is redundant, but is implemented for Svelte store values.
 * Perhaps think of something cleaner */
export const getSetting = <T extends keyof BannerSettings>(
  key: T,
  value?: BannerSettings[T]
): BannerSettings[T] => (value ?? plug.settings[key] ?? DEFAULT_SETTINGS[key]);

export const loadSettings = async () => {
  const settings = Object.assign({}, DEFAULT_SETTINGS, await plug.loadData()) as BannerSettings;
  for (const [key, val] of Object.entries(settings) as [keyof BannerSettings, unknown][]) {
    if (
      DEFAULT_SETTINGS[key] === val &&
      (typeof val === 'number' || TEXT_SETTINGS.includes(key))
    ) delete settings[key];
  }
  plug.settings = settings;
  await saveSettings();
  plug.addSettingTab(new SettingsTab());
};

export const saveSettings = async (changed: Partial<BannerSettings> = {}) => {
  await plug.saveData(plug.settings);
  store.set(plug.settings);
  plug.events.trigger('setting-change', changed);
  console.log(plug.settings);
};
