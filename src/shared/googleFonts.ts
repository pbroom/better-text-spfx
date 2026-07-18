import { googleFontsCatalog, GoogleFontFamily } from './googleFontsCatalog';

export { googleFontsCatalog };
export type { GoogleFontFamily };

const loadedFamilies = new Set<string>();

export function findGoogleFontFamily(family: string | undefined): GoogleFontFamily | undefined {
  const normalized = (family || '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return googleFontsCatalog.find((entry) => entry.family.toLowerCase() === normalized);
}

export function createGoogleFontStylesheetUrl(font: GoogleFontFamily): string {
  const family = font.family.replace(/ /g, '+');
  const weights = font.weights.length ? font.weights : [400];

  if (font.italic) {
    const tuples = [
      ...weights.map((weight) => `0,${weight}`),
      ...weights.map((weight) => `1,${weight}`)
    ].join(';');
    return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${tuples}&display=swap`;
  }

  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(';')}&display=swap`;
}

/**
 * Loads a Google font by injecting a stylesheet link into document.head.
 * Document-level @font-face rules apply inside shadow roots, so both the
 * SPFx shadow DOM render and the lab preview share this loader. Returns the
 * catalog entry when the family is a known Google font.
 */
export function ensureGoogleFontLoaded(family: string | undefined): GoogleFontFamily | undefined {
  const font = findGoogleFontFamily(family);
  if (!font || typeof document === 'undefined') {
    return font;
  }
  if (loadedFamilies.has(font.family)) {
    return font;
  }

  loadedFamilies.add(font.family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = createGoogleFontStylesheetUrl(font);
  link.setAttribute('data-better-text-font', font.family);
  document.head.appendChild(link);
  return font;
}

export const popularGoogleFontFamilies = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans 3',
  'Nunito',
  'Raleway',
  'Work Sans',
  'DM Sans',
  'Rubik',
  'Karla',
  'Space Grotesk',
  'Oswald',
  'Bebas Neue',
  'Playfair Display',
  'Merriweather',
  'Lora',
  'Crimson Text',
  'PT Serif',
  'EB Garamond',
  'Libre Baskerville',
  'Fira Sans',
  'IBM Plex Sans',
  'Josefin Sans',
  'Quicksand',
  'Caveat',
  'Dancing Script',
  'JetBrains Mono'
];

export interface GoogleFontPickerOption {
  label: string;
  value: string;
}

export const themeDefaultFontLabel = 'Theme default';

const systemFontStacks: Record<string, string> = {
  'Times New Roman': '"Times New Roman", Times, serif',
  Calibri: 'Calibri, "Segoe UI", Arial, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Garamond: 'Garamond, "Times New Roman", serif'
};

const featuredFontFamilies = [
  'EB Garamond',
  'Times New Roman',
  'Calibri',
  'Arial',
  'Garamond'
];

/**
 * Options for a font picker: theme default first, then popular families,
 * then the rest of the catalog alphabetically.
 */
export function createGoogleFontPickerOptions(): GoogleFontPickerOption[] {
  const featured = featuredFontFamilies.map((family) => ({ label: family, value: family }));
  const featuredSet = new Set(featured.map((option) => option.value));
  const popular = popularGoogleFontFamilies
    .filter((family) => !featuredSet.has(family))
    .map((family) => findGoogleFontFamily(family))
    .filter((font): font is GoogleFontFamily => Boolean(font))
    .map((font) => ({ label: font.family, value: font.family }));
  const popularSet = new Set([...featuredSet, ...popular.map((option) => option.value)]);
  const rest = googleFontsCatalog
    .filter((font) => !popularSet.has(font.family))
    .map((font) => ({ label: font.family, value: font.family }));

  return [{ label: themeDefaultFontLabel, value: '' }, ...featured, ...popular, ...rest];
}

export function filterGoogleFontPickerOptions(
  options: GoogleFontPickerOption[],
  query: string,
  limit = 50
): GoogleFontPickerOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options.slice(0, limit);
  }
  return options
    .filter((option) => option.label.toLowerCase().includes(normalized) || option.value === '')
    .slice(0, limit);
}

const fallbackStacks: Record<string, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  'sans serif': '"Segoe UI", system-ui, sans-serif',
  display: '"Segoe UI", system-ui, sans-serif',
  handwriting: 'cursive',
  monospace: 'Menlo, Consolas, monospace'
};

export const themeDefaultFontStack =
  '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';

export function createFontFamilyValue(family: string | undefined): string {
  const normalizedFamily = (family || '').trim();
  const systemStack = systemFontStacks[normalizedFamily];
  if (systemStack) {
    return systemStack;
  }
  const font = findGoogleFontFamily(family);
  if (!font) {
    return themeDefaultFontStack;
  }
  const fallback = fallbackStacks[font.category] || fallbackStacks['sans serif'];
  return `"${font.family}", ${fallback}`;
}

/**
 * Extracts a supported font family name from a CSS font-family value, e.g.
 * '"Playfair Display", Georgia, serif' -> 'Playfair Display'. Returns an
 * empty string (theme default) when the first entry is not a Google font.
 */
export function parseGoogleFontFamilyFromCssValue(value: string | undefined): string {
  const first = (value || '').split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') || '';
  if (!first || /^var\(/i.test(first)) {
    return '';
  }
  const systemFamily = Object.keys(systemFontStacks).find((family) => family.toLowerCase() === first.toLowerCase());
  if (systemFamily) {
    return systemFamily;
  }
  const font = findGoogleFontFamily(first);
  return font ? font.family : '';
}
