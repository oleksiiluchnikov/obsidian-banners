import { Platform, requestUrl } from 'obsidian';
import type { FrontMatterCache, TFile } from 'obsidian';
import { IMAGE_FORMATS } from 'src/bannerData';
import type { IconString } from 'src/bannerData';
import { plug } from 'src/main';
import type { Embedded } from 'src/reading/BannerRenderChild';
import { getSetting, parseCssSetting } from 'src/settings';
import type {
  HeaderHorizontalAlignmentOption,
  HeaderVerticalAlignmentOption,
  BannerSettings
} from 'src/settings/structure';

export type ViewType = 'editing' | 'reading';
interface Heights { banner: string; icon: string }

export const WRAPPER_CLASS = 'obsidian-banner-wrapper';

const getInternalFile = (src: string, file: TFile): TFile | null => {
  const isInternalLink = /^\[\[.+\]\]/.test(src);
  if (!isInternalLink) return null;

  const link = src.slice(2, -2);
  return plug.app.metadataCache.getFirstLinkpathDest(link, file.path);
};

export const fetchImage = async (src: string, file: TFile): Promise<string | null> => {
  // Check if it's an internal link to an image and use that if it is
  const internalFile = getInternalFile(src, file);
  if (internalFile) {
    if (!IMAGE_FORMATS.includes(internalFile.extension)) {
      throw new Error(`${internalFile.name} is not an image!`);
    }
    return plug.app.vault.getResourcePath(internalFile);
  }

  try {
    const resp = await requestUrl(src);
    const blob = new Blob([resp.arrayBuffer], { type: resp.headers['content-type'] });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  } catch (error: any) {
    throw new Error(error);
  }
};

export const getHeights = (embedded: Embedded, _deps?: any[]): Heights => {
  let bannerHeight = getSetting(Platform.isMobile ? 'mobileHeight' : 'height');
  if (embedded === 'internal') bannerHeight = getSetting('internalEmbedHeight');
  else if (embedded === 'popover') bannerHeight = getSetting('popoverHeight');

  const banner = parseCssSetting(bannerHeight);
  const icon = parseCssSetting(getSetting('headerSize'));
  return { banner, icon };
};

const hasHeaderElement = (
  icon: IconString | undefined,
  header: string[] | string | null | undefined
): boolean => !!(icon || header !== undefined);

export const getBannerHeight = (
  heights: Heights,
  source: string | undefined,
  icon: IconString | undefined,
  header: string[] | string | null | undefined
): string => {
  if (source) return heights.banner;
  else if (hasHeaderElement(icon, header)) return heights.icon;
  return '';
};

const getHeaderExtraOffset = (offset: string, alignment: HeaderVerticalAlignmentOption): string => {
  switch (alignment) {
    case 'center':
    case 'above': return '0px';
    case 'edge':
    case 'custom': return `(${offset} / 2)`;
    case 'below': return offset;
  }
};

export const getSizerHeight = (
  heights: Heights,
  source: string | undefined,
  header: string[] | string | null | undefined,
  icon: IconString | undefined,
  iconAlignment: HeaderVerticalAlignmentOption
): string => {
  if (source) {
    if (hasHeaderElement(icon, header)) {
      const extraOffset = getHeaderExtraOffset(heights.icon, iconAlignment);
      return `calc(${heights.banner} + ${extraOffset})`;
    } else {
      return heights.banner;
    }
  } else if (hasHeaderElement(icon, header)) {
    return heights.icon;
  }
  return '';
};

const getFrontMatterKey = (key: string | undefined,
  frontmatter: FrontMatterCache | undefined, header?: string): string | undefined => {
  if (!frontmatter || !key) return header;
  if (frontmatter[key]) {
    /** Obsidian automatically convert "alias" to "aliases" */
    const keyName = key === 'alias' ? 'aliases' : key;
    if (Array.isArray(frontmatter[keyName])) {
      return frontmatter[keyName][0];
    }
    return frontmatter[keyName];
  }
  return header;
};

export const getHeaderText = (header: string[] | string | null | undefined,
  file: TFile,
  settings: BannerSettings):
  string | undefined => {
  const frontmatter = plug.app.metadataCache.getFileCache(file)?.frontmatter;
  if (settings.headerPropertyKey && settings.headerByDefault && frontmatter) {
    const key = settings.headerPropertyKey;
    return getFrontMatterKey(key, frontmatter, file.basename);
  }
  if (settings.headerByDefault && header === undefined) return file.basename;
  if (header === undefined) return undefined;
  if (header === null) return file.basename;
  /** In list it is useful to have fallback. ie if a key don't exist, use the second, etc.
   * If no key exist, it returns the header join by space
   */
  if (Array.isArray(header)) {
    if (!frontmatter) return header.join(' ');
    for (const h of header) {
      const propertyKey = h.match(/\{{(.*)\}}/)?.[1];
      const frontmatterKey = getFrontMatterKey(propertyKey, frontmatter);
      console.log(frontmatterKey);
      if (propertyKey === 'file') {
        return file.basename;
      } else if (frontmatterKey) {
        return frontmatterKey;
      }
    }
    return header.join(' ');
  }
  /** Allow to use also a string to allow a "fusion" of value from the frontmatter
   * ie: header: "{{title}} - {{author}}" ⇒ "My title - My author"
   * useful for templating and the frontmatter title plugin
  */
  const properties = header.match(/{{(.*?)}}/g);
  if (properties) {
    for (const property of properties) {
      const keyName = property.slice(2, -2);
      const keyValue = getFrontMatterKey(keyName, frontmatter);
      if (keyValue) header = header.replace(property, keyValue);
      else if (keyName === 'file') header = header.replace(property, file.basename);
    }
  }
  console.log('HEADER', header);
  return header;

};

export const getHeaderTransform = (
  horizontal: HeaderHorizontalAlignmentOption,
  hTransform: string,
  vertical: HeaderVerticalAlignmentOption,
  vTransform: string
): string => {
  const h = (horizontal === 'custom') ? hTransform : '0px';
  let v: string;
  switch (vertical) {
    case 'above': v = '0%'; break;
    case 'center':
    case 'edge': v = '50%'; break;
    case 'below': v = '100%'; break;
    case 'custom': v = vTransform; break;
  }
  return `translate(${h}, ${v})`;
};
