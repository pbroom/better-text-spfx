import {
  createFontFamilyValue,
  parseGoogleFontFamilyFromCssValue,
  themeDefaultFontStack
} from './googleFonts';

export interface BetterTextProperties {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontSizeUnit: BetterTextLengthUnit;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  letterSpacingUnit: BetterTextLetterSpacingUnit;
  instanceClassName: string;
  customCss: string;
}

export type BetterTextLengthUnit = 'px' | '%' | 'em' | 'rem' | 'pt';
export type BetterTextLetterSpacingUnit = Exclude<BetterTextLengthUnit, '%'>;

export interface BetterTextCssTarget {
  label: string;
  selector: string;
  snippet: string;
  editable?: boolean;
  renameLabel?: string;
}

export const betterTextFontSizeRange = { min: 0.1, max: 512, step: 0.1 };
export const betterTextFontWeightOptions = [
  { label: 'Thin 100', value: '100' },
  { label: 'Extra light 200', value: '200' },
  { label: 'Light 300', value: '300' },
  { label: 'Regular 400', value: '400' },
  { label: 'Medium 500', value: '500' },
  { label: 'Semibold 600', value: '600' },
  { label: 'Bold 700', value: '700' },
  { label: 'Extra bold 800', value: '800' },
  { label: 'Black 900', value: '900' }
] as const;
export const betterTextLineHeightRange = { min: 0.8, max: 3, step: 0.05 };
export const betterTextLetterSpacingRange = { min: -100, max: 100, step: 0.1 };

export const defaultBetterTextProperties: BetterTextProperties = {
  content: '<p>Start writing with Better Text.</p>',
  fontFamily: '',
  fontSize: 17,
  fontSizeUnit: 'px',
  fontWeight: 400,
  lineHeight: 1.4,
  letterSpacing: 0,
  letterSpacingUnit: 'px',
  instanceClassName: createBetterTextInstanceClass('better-text-default'),
  customCss: ''
};

const betterTextCssTargetCommentMarker = 'Better Text SCSS targets';

export function normalizeBetterTextProperties(
  properties: Partial<BetterTextProperties> = {}
): BetterTextProperties {
  return {
    content: normalizeContent(properties.content),
    fontFamily: normalizeFontFamily(properties.fontFamily),
    fontSize: clampRangeNumber(
      properties.fontSize,
      betterTextFontSizeRange.min,
      betterTextFontSizeRange.max,
      defaultBetterTextProperties.fontSize
    ),
    fontSizeUnit: normalizeLengthUnit(properties.fontSizeUnit, defaultBetterTextProperties.fontSizeUnit),
    fontWeight: normalizeFontWeight(properties.fontWeight),
    lineHeight: clampRangeNumber(
      properties.lineHeight,
      betterTextLineHeightRange.min,
      betterTextLineHeightRange.max,
      defaultBetterTextProperties.lineHeight
    ),
    letterSpacing: clampRangeNumber(
      properties.letterSpacing,
      betterTextLetterSpacingRange.min,
      betterTextLetterSpacingRange.max,
      defaultBetterTextProperties.letterSpacing
    ),
    letterSpacingUnit: normalizeLetterSpacingUnit(
      properties.letterSpacingUnit,
      defaultBetterTextProperties.letterSpacingUnit
    ),
    instanceClassName: normalizeCssClassName(
      properties.instanceClassName,
      defaultBetterTextProperties.instanceClassName
    ),
    customCss: normalizeCustomCss(properties.customCss)
  };
}

export function createBetterTextCss(customCss = ''): string {
  const normalized = normalizeCustomCss(customCss);
  const compiled = compileBetterTextScss(normalized);
  return `${betterTextBaseCss}${compiled ? `\n\n/* Custom CSS/SCSS */\n${compiled}` : ''}`;
}

export function createBetterTextControlCss(properties: Partial<BetterTextProperties> = {}): string {
  const normalized = normalizeBetterTextProperties(properties);
  return ensureBetterTextCssTargetComment(
    createRule('.better-text__content', createContentDeclarations(normalized)),
    normalized.instanceClassName
  );
}

export function parseBetterTextPropertiesFromCss(
  css: string | undefined,
  fallbackProperties: Partial<BetterTextProperties> = {}
): BetterTextProperties {
  const source = normalizeCustomCss(css);
  const compiledCss = compileBetterTextScss(source);
  const contentDeclarations = parseDeclarationMap(readCssRuleBody(compiledCss, '.better-text__content'));
  const parsedFontFamily = parseFontFamilyDeclaration(contentDeclarations['font-family']);
  const parsedFontSize = parseLengthDeclaration(
    contentDeclarations['font-size'],
    normalizeLengthUnit(fallbackProperties.fontSizeUnit, defaultBetterTextProperties.fontSizeUnit)
  );
  const parsedFontWeight = parseFontWeightDeclaration(contentDeclarations['font-weight']);
  const parsedLineHeight = parseLineHeight(contentDeclarations['line-height']);
  const parsedLetterSpacing = parseLetterSpacing(
    contentDeclarations['letter-spacing'],
    normalizeLetterSpacingUnit(fallbackProperties.letterSpacingUnit, defaultBetterTextProperties.letterSpacingUnit)
  );

  return normalizeBetterTextProperties({
    content: fallbackProperties.content,
    fontFamily: parsedFontFamily === undefined
      ? fallbackProperties.fontFamily || defaultBetterTextProperties.fontFamily
      : parsedFontFamily,
    fontSize: parsedFontSize?.value
      ?? numberOrDefault(fallbackProperties.fontSize, defaultBetterTextProperties.fontSize),
    fontSizeUnit: parsedFontSize?.unit
      ?? normalizeLengthUnit(fallbackProperties.fontSizeUnit, defaultBetterTextProperties.fontSizeUnit),
    fontWeight: parsedFontWeight
      ?? numberOrDefault(fallbackProperties.fontWeight, defaultBetterTextProperties.fontWeight),
    lineHeight: parsedLineHeight === undefined
      ? numberOrDefault(fallbackProperties.lineHeight, defaultBetterTextProperties.lineHeight)
      : parsedLineHeight,
    letterSpacing: parsedLetterSpacing === undefined
      ? numberOrDefault(fallbackProperties.letterSpacing, defaultBetterTextProperties.letterSpacing)
      : parsedLetterSpacing.value,
    letterSpacingUnit: parsedLetterSpacing?.unit
      ?? normalizeLetterSpacingUnit(
        fallbackProperties.letterSpacingUnit,
        defaultBetterTextProperties.letterSpacingUnit
      ),
    instanceClassName: fallbackProperties.instanceClassName || defaultBetterTextProperties.instanceClassName,
    customCss: source
  });
}

export function compileBetterTextScss(source: string | undefined): string {
  const normalized = normalizeCustomCss(source);
  if (!normalized.trim()) {
    return '';
  }
  const variables: Record<string, string> = {};
  const withoutComments = stripCssComments(normalized);
  const withoutVariables = withoutComments.replace(/\$([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g, (
    _match,
    name: string,
    value: string
  ) => {
    variables[name] = value.trim();
    return '';
  });
  const substituted = withoutVariables.replace(/\$([A-Za-z0-9_-]+)/g, (_match, name: string) => variables[name] || '');
  return flattenNestedScss(substituted);
}

export function syncBetterTextCssFromProperties(
  css: string | undefined,
  properties: Partial<BetterTextProperties>
): string {
  const normalized = normalizeBetterTextProperties(properties);
  const source = normalizeCustomCss(css);

  if (!source.trim()) {
    return createBetterTextControlCss(normalized);
  }

  return ensureBetterTextCssTargetComment(
    replaceOrAppendRule(source, '.better-text__content', createContentDeclarations(normalized)),
    normalized.instanceClassName
  );
}

export function normalizeBetterTextInstanceClassName(
  value: string | undefined,
  fallback = defaultBetterTextProperties.instanceClassName
): string {
  return normalizeCssClassName(value, fallback);
}

export function renameBetterTextInstanceClassInCss(
  css: string | undefined,
  previousClassName: string | undefined,
  nextClassName: string | undefined
): string {
  const previous = normalizeCssClassName(previousClassName, defaultBetterTextProperties.instanceClassName);
  const next = normalizeCssClassName(nextClassName, previous);
  const source = normalizeCustomCss(css);

  if (previous === next) {
    return ensureBetterTextCssTargetComment(source, next);
  }

  return ensureBetterTextCssTargetComment(
    source.replace(createCssClassSelectorPattern(previous), `.${next}`),
    next
  );
}

export function betterTextRootClassName(properties: Partial<BetterTextProperties>): string {
  const instanceClassName = normalizeBetterTextProperties(properties).instanceClassName;
  return `better-text ${instanceClassName}`;
}

export function createBetterTextStyleVariables(properties: BetterTextProperties): Record<string, string> {
  return {
    '--better-text-font-family': createFontFamilyValue(properties.fontFamily),
    '--better-text-font-size': formatLength(properties.fontSize, properties.fontSizeUnit),
    '--better-text-font-weight': `${properties.fontWeight}`,
    '--better-text-line-height': `${properties.lineHeight}`,
    '--better-text-letter-spacing': formatLength(properties.letterSpacing, properties.letterSpacingUnit)
  };
}

export function createBetterTextCssTargetComment(instanceClassName?: string): string {
  const normalizedInstanceClassName = normalizeCssClassName(
    instanceClassName,
    defaultBetterTextProperties.instanceClassName
  );
  return `/*
Better Text SCSS targets:
:host - web part host element.
.better-text - wrapper around the rich text content.
.better-text__content - rich text body, font family, size, weight, leading, and letter spacing.
.${normalizedInstanceClassName} - generated instance class on this text web part only.
*/`;
}

export function createBetterTextCssTargets(
  properties: Partial<BetterTextProperties> = {}
): BetterTextCssTarget[] {
  const normalized = normalizeBetterTextProperties(properties);
  const instanceSelector = `.${normalized.instanceClassName}`;

  return [
    {
      label: ':host',
      selector: ':host',
      snippet: ':host {\n  display: block;\n}'
    },
    {
      label: '.better-text',
      selector: '.better-text',
      snippet: '.better-text {\n  /* Wrapper styles */\n}'
    },
    {
      label: '.better-text__content',
      selector: '.better-text__content',
      snippet: createRule('.better-text__content', createContentDeclarations(normalized))
    },
    {
      label: instanceSelector,
      selector: instanceSelector,
      snippet: `${instanceSelector} {\n  /* Instance-only wrapper styles */\n}`,
      editable: true,
      renameLabel: 'Edit instance class'
    }
  ];
}

export function createBetterTextInstanceClass(seed = ''): string {
  const source = seed.trim() || `${Date.now()}-${Math.random()}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `bt-${(hash >>> 0).toString(36).padStart(7, '0').slice(0, 7)}`;
}

function createContentDeclarations(properties: BetterTextProperties): Record<string, string> {
  return {
    'font-family': createFontFamilyValue(properties.fontFamily),
    'font-size': formatLength(properties.fontSize, properties.fontSizeUnit),
    'font-weight': `${properties.fontWeight}`,
    'line-height': `${properties.lineHeight}`,
    'letter-spacing': formatLength(properties.letterSpacing, properties.letterSpacingUnit)
  };
}

function parseFontFamilyDeclaration(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseGoogleFontFamilyFromCssValue(value);
}

function parseLineHeight(value: string | undefined): number | undefined {
  const next = (value || '').trim();
  if (!next) {
    return undefined;
  }
  if (next === 'normal') {
    return defaultBetterTextProperties.lineHeight;
  }
  const unitless = next.match(/^(-?\d+(?:\.\d+)?)$/);
  if (unitless) {
    const parsed = Number(unitless[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseLetterSpacing(
  value: string | undefined,
  fallbackUnit: BetterTextLetterSpacingUnit
): { value: number; unit: BetterTextLetterSpacingUnit } | undefined {
  const next = (value || '').trim();
  if (!next) {
    return undefined;
  }
  if (next === 'normal' || next === '0') {
    return { value: 0, unit: fallbackUnit };
  }
  const parsed = parseLengthDeclaration(next, fallbackUnit);
  if (!parsed || parsed.unit === '%') {
    return undefined;
  }
  return { value: parsed.value, unit: parsed.unit };
}

function parseLengthDeclaration(
  value: string | undefined,
  fallbackUnit: BetterTextLengthUnit
): { value: number; unit: BetterTextLengthUnit } | undefined {
  const match = (value || '').trim().match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem|pt)?$/i);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const unit = match[2]
    ? normalizeLengthUnit(match[2].toLowerCase(), fallbackUnit)
    : fallbackUnit;
  return { value: parsed, unit };
}

function parseFontWeightDeclaration(value: string | undefined): number | undefined {
  const next = (value || '').trim().toLowerCase();
  if (!next) {
    return undefined;
  }
  if (next === 'normal') {
    return 400;
  }
  if (next === 'bold') {
    return 700;
  }
  if (!/^\d+$/.test(next)) {
    return undefined;
  }
  return normalizeFontWeight(Number(next));
}

function createRule(selector: string, declarations: Record<string, string>): string {
  const body = Object.entries(declarations)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

function ensureBetterTextCssTargetComment(css: string, instanceClassName?: string): string {
  const source = normalizeCustomCss(css).trimStart();
  const comment = createBetterTextCssTargetComment(instanceClassName);
  if (!source.trim()) {
    return comment;
  }
  if (source.includes(betterTextCssTargetCommentMarker)) {
    const replaced = source.replace(/\/\*[\s\S]*?Better Text SCSS targets:[\s\S]*?\*\//, comment);
    return replaced === source ? source : replaced;
  }
  return `${comment}\n\n${source}`;
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalizeContent(value: string | undefined): string {
  if (typeof value !== 'string') {
    return defaultBetterTextProperties.content;
  }
  return value.slice(0, 100000);
}

function normalizeFontFamily(value: string | undefined): string {
  const next = typeof value === 'string' ? value.trim() : '';
  if (!next || next.length > 64) {
    return defaultBetterTextProperties.fontFamily;
  }
  return next;
}

function normalizeLengthUnit(
  value: BetterTextLengthUnit | string | undefined,
  fallback: BetterTextLengthUnit
): BetterTextLengthUnit {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'px' || normalized === '%' || normalized === 'em' || normalized === 'rem' || normalized === 'pt'
    ? normalized
    : fallback;
}

function normalizeLetterSpacingUnit(
  value: BetterTextLengthUnit | string | undefined,
  fallback: BetterTextLetterSpacingUnit
): BetterTextLetterSpacingUnit {
  const normalized = normalizeLengthUnit(value, fallback);
  return normalized === '%' ? fallback : normalized;
}

function normalizeFontWeight(value: number | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultBetterTextProperties.fontWeight;
  }
  return Math.min(900, Math.max(100, Math.round(parsed / 100) * 100));
}

function formatLength(value: number, unit: BetterTextLengthUnit): string {
  return `${value}${unit}`;
}

function normalizeCustomCss(value: string | undefined): string {
  if (typeof value !== 'string') {
    return defaultBetterTextProperties.customCss;
  }
  return value.slice(0, 12000);
}

function normalizeCssClassName(value: string | undefined, fallback: string): string {
  const next = typeof value === 'string' ? value.trim().replace(/^\./, '') : '';
  if (/^[A-Za-z_][-_A-Za-z0-9]{1,31}$/.test(next)) {
    return next;
  }
  return fallback;
}

function createCssClassSelectorPattern(className: string): RegExp {
  return new RegExp(`\\.${escapeRegExp(className)}(?=$|[^-_A-Za-z0-9])`, 'g');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clampRangeNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.min(Math.max(parsed, min), max);
  return Math.round(clamped * 100) / 100;
}

function numberOrDefault(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCssRuleBody(css: string, selector: string): string | undefined {
  const selectorIndex = findRuleSelectorIndex(css, selector);
  if (selectorIndex < 0) {
    return undefined;
  }

  const openIndex = css.indexOf('{', selectorIndex + selector.length);
  if (openIndex < 0) {
    return undefined;
  }

  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') {
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(openIndex + 1, index);
      }
    }
  }

  return undefined;
}

function parseDeclarationMap(body: string | undefined): Record<string, string> {
  const declarations: Record<string, string> = {};
  if (!body) {
    return declarations;
  }

  body.split(';').forEach((entry) => {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex < 0) {
      return;
    }
    const property = entry.slice(0, separatorIndex).trim().toLowerCase();
    const value = entry.slice(separatorIndex + 1).trim();
    if (property && value) {
      declarations[property] = value;
    }
  });

  return declarations;
}

function replaceOrAppendRule(css: string, selector: string, declarations: Record<string, string>): string {
  const existingBody = readCssRuleBody(css, selector);
  const mergedRule = createRule(selector, mergeDeclarations(existingBody, declarations));

  if (existingBody === undefined) {
    return `${css.trimEnd()}\n\n${mergedRule}`;
  }

  const selectorIndex = findRuleSelectorIndex(css, selector);
  const openIndex = css.indexOf('{', selectorIndex + selector.length);
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') {
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return `${css.slice(0, selectorIndex)}${mergedRule}${css.slice(index + 1)}`;
      }
    }
  }

  return `${css.trimEnd()}\n\n${mergedRule}`;
}

function flattenNestedScss(css: string): string {
  const trimmed = css.trim();
  if (!trimmed.includes('{')) {
    return trimmed;
  }
  const output: string[] = [];

  function parseBlock(selector: string, body: string): void {
    const directParts: string[] = [];
    let cursor = 0;
    let searchIndex = 0;
    let openIndex = body.indexOf('{', searchIndex);

    while (openIndex >= 0) {
      const selectorStart = findNestedSelectorStart(body, openIndex);
      const closeIndex = findMatchingBrace(body, openIndex);
      if (closeIndex < 0) {
        break;
      }

      directParts.push(body.slice(cursor, selectorStart));
      const childSelector = body.slice(selectorStart, openIndex).trim();
      const childBody = body.slice(openIndex + 1, closeIndex).trim();
      const resolved = childSelector
        .split(',')
        .map((item) => {
          const value = item.trim();
          return value.includes('&') ? value.replace(/&/g, selector) : `${selector} ${value}`;
        })
        .join(', ');
      output.push(`${resolved} { ${childBody} }`);
      cursor = closeIndex + 1;
      searchIndex = closeIndex + 1;
      openIndex = body.indexOf('{', searchIndex);
    }

    directParts.push(body.slice(cursor));
    const direct = directParts.join('');
    if (direct.trim()) {
      output.unshift(`${selector} { ${direct.trim()} }`);
    }
  }

  const topRegex = /([^{}]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = topRegex.exec(trimmed))) {
    parseBlock(match[1].trim(), match[2]);
  }
  return output.length ? output.join('\n') : trimmed;
}

function findNestedSelectorStart(body: string, openIndex: number): number {
  for (let index = openIndex - 1; index >= 0; index -= 1) {
    const char = body[index];
    if (char === ';' || char === '}') {
      return index + 1;
    }
  }
  return 0;
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function findRuleSelectorIndex(css: string, selector: string): number {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escapedSelector}\\s*\\{`).exec(css);
  return match ? match.index : -1;
}

function mergeDeclarations(
  existingBody: string | undefined,
  canonicalDeclarations: Record<string, string>
): Record<string, string> {
  const existingDeclarations = parseDeclarationMap(existingBody);
  const canonicalKeys = new Set([...Object.keys(canonicalDeclarations), 'font']);
  const merged: Record<string, string> = { ...canonicalDeclarations };

  Object.entries(existingDeclarations).forEach(([property, value]) => {
    if (!canonicalKeys.has(property)) {
      merged[property] = value;
    }
  });

  return merged;
}

const betterTextBaseCss = `:host {
  display: block;
}

.better-text {
  box-sizing: border-box;
  width: 100%;
}

.better-text__content {
  box-sizing: border-box;
  color: inherit;
  font-family: var(--better-text-font-family, ${themeDefaultFontStack});
  font-size: var(--better-text-font-size, 17px);
  font-weight: var(--better-text-font-weight, 400);
  line-height: var(--better-text-line-height, 1.4);
  letter-spacing: var(--better-text-letter-spacing, 0px);
  overflow-wrap: break-word;
}

.better-text__content > :first-child {
  margin-top: 0;
}

.better-text__content > :last-child {
  margin-bottom: 0;
}

.better-text__content p {
  margin: 0 0 0.5em;
}

.better-text__content h2,
.better-text__content h3,
.better-text__content h4 {
  margin: 0.75em 0 0.35em;
  font-weight: 600;
  line-height: 1.25;
}

.better-text__content h2 {
  font-size: 1.7em;
}

.better-text__content h3 {
  font-size: 1.4em;
}

.better-text__content h4 {
  font-size: 1.15em;
}

.better-text__content ul,
.better-text__content ol {
  margin: 0 0 0.5em;
  padding-inline-start: 1.6em;
}

.better-text__content li {
  margin: 0.15em 0;
}

.better-text__content a {
  color: #0078d4;
  text-decoration: underline;
}

.better-text__content blockquote {
  margin: 0.5em 0;
  border-inline-start: 3px solid #c8c6c4;
  padding: 0.25em 0 0.25em 1em;
  color: #605e5c;
}`;
