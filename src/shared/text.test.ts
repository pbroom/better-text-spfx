/// <reference types="jest" />

import {
  betterTextFontWeightOptions,
  createBetterTextControlCss,
  createBetterTextCss,
  defaultBetterTextProperties,
  discoverBetterTextCustomStyles,
  normalizeBetterTextProperties,
  normalizeBetterTextStyleClassName,
  parseBetterTextPropertiesFromCss,
  syncBetterTextCssFromProperties
} from './text';

describe('Better Text typography properties', () => {
  it('keeps legacy typography properties compatible with pixel spacing', () => {
    const properties = normalizeBetterTextProperties({
      fontFamily: 'Open Sans',
      letterSpacing: 1.5
    });

    expect(properties.fontSize).toBe(17);
    expect(properties.fontSizeUnit).toBe('px');
    expect(properties.fontWeight).toBe(400);
    expect(properties.letterSpacing).toBe(1.5);
    expect(properties.letterSpacingUnit).toBe('px');
  });

  it('parses customized font size, font weight, and letter-spacing units from CSS', () => {
    const properties = parseBetterTextPropertiesFromCss(`
.better-text__content {
  font-family: "Open Sans", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.05em;
}
`);

    expect(properties.fontFamily).toBe('Open Sans');
    expect(properties.fontSize).toBe(24);
    expect(properties.fontSizeUnit).toBe('px');
    expect(properties.fontWeight).toBe(700);
    expect(properties.letterSpacing).toBe(-0.05);
    expect(properties.letterSpacingUnit).toBe('em');
  });

  it('allows percentage font sizes but rejects percentage letter spacing', () => {
    const properties = parseBetterTextPropertiesFromCss(`
.better-text__content {
  font-size: 125%;
  letter-spacing: -1%;
}
`, {
      letterSpacing: 0.25,
      letterSpacingUnit: 'rem'
    });

    expect(properties.fontSize).toBe(125);
    expect(properties.fontSizeUnit).toBe('%');
    expect(properties.letterSpacing).toBe(0.25);
    expect(properties.letterSpacingUnit).toBe('rem');
    expect(normalizeBetterTextProperties({ letterSpacingUnit: '%' as never }).letterSpacingUnit).toBe('px');
  });

  it('offers every normalized font weight in the shared control options', () => {
    expect(betterTextFontWeightOptions.map((option) => Number(option.value))).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900
    ]);
    expect(normalizeBetterTextProperties({ fontWeight: 100 }).fontWeight).toBe(100);
    expect(normalizeBetterTextProperties({ fontWeight: 200 }).fontWeight).toBe(200);
  });

  it('round-trips authored units while preserving unrelated declarations', () => {
    const source = `.better-text__content {
  color: rebeccapurple;
  font-size: 1.25rem;
  font-weight: bold;
  letter-spacing: -0.02em;
}`;
    const parsed = parseBetterTextPropertiesFromCss(source, defaultBetterTextProperties);
    const synced = syncBetterTextCssFromProperties(source, {
      ...parsed,
      letterSpacing: -0.03
    });

    expect(synced).toMatch(/color: rebeccapurple;/);
    expect(synced).toMatch(/font-size: 1\.25rem;/);
    expect(synced).toMatch(/font-weight: 700;/);
    expect(synced).toMatch(/letter-spacing: -0\.03em;/);
  });

  it('includes all sidebar typography controls in starter CSS', () => {
    const css = createBetterTextControlCss(defaultBetterTextProperties);

    expect(css).toMatch(/font-size: 17px;/);
    expect(css).toMatch(/font-weight: 400;/);
    expect(css).toMatch(/letter-spacing: 0px;/);
    expect(discoverBetterTextCustomStyles(css)).toEqual([
      { className: 'bt-style--eyebrow', label: 'Eyebrow' },
      { className: 'bt-style--display-title', label: 'Display title' }
    ]);
  });
});

describe('Better Text custom styles', () => {
  it('discovers opt-in style classes from CSS and nested SCSS in source order', () => {
    const styles = discoverBetterTextCustomStyles(`
.bt-style--eyebrow,
p.bt-style--hero-title:hover {
  font-weight: 700;
}

.better-text__content {
  .bt-style--feature-card {
    letter-spacing: 0.08em;
  }
}

.bt-style--eyebrow strong {
  text-transform: uppercase;
}
`);

    expect(styles).toEqual([
      { className: 'bt-style--eyebrow', label: 'Eyebrow' },
      { className: 'bt-style--hero-title', label: 'Hero title' },
      { className: 'bt-style--feature-card', label: 'Feature card' }
    ]);
  });

  it('ignores comments, declaration strings, unrelated classes, and invalid style names', () => {
    const styles = discoverBetterTextCustomStyles(`
/* .bt-style--comment-only { color: red; } */
.example::before {
  content: ".bt-style--string-only";
}
.foo-bt-style--partial,
.bt-style--Uppercase,
.bt-style--trailing- {
  color: red;
}
.bt-style--display-2 {
  font-size: 2rem;
}
`);

    expect(styles).toEqual([
      { className: 'bt-style--display-2', label: 'Display 2' }
    ]);
  });

  it('normalizes only opt-in lowercase kebab-case class names', () => {
    expect(normalizeBetterTextStyleClassName('.bt-style--lead-copy')).toBe('bt-style--lead-copy');
    expect(normalizeBetterTextStyleClassName('unrelated')).toBe('');
    expect(normalizeBetterTextStyleClassName('bt-style--Uppercase')).toBe('');
    expect(normalizeBetterTextStyleClassName('bt-style--')).toBe('');
  });

  it('gives preset selectors enough specificity to override base typography', () => {
    const css = createBetterTextCss('.bt-style--lede { font-size: 2rem; }');

    expect(css).toMatch(/\.bt-style--lede\.bt-style--lede\s*\{/);
  });

  it('does not rewrite class-like text inside quoted selector values', () => {
    const css = createBetterTextCss(
      '[data-token=".bt-style--card"] .bt-style--card { font-weight: 700; }'
    );

    expect(css).toContain(
      '[data-token=".bt-style--card"] .bt-style--card.bt-style--card {'
    );
    expect(css).not.toContain('[data-token=".bt-style--card.bt-style--card"]');
  });

  it('preserves a selected style through CSS parsing and rejects arbitrary persisted classes', () => {
    const parsed = parseBetterTextPropertiesFromCss('.bt-style--lede { font-size: 20px; }', {
      textStyleClassName: 'bt-style--lede'
    });

    expect(parsed.textStyleClassName).toBe('bt-style--lede');
    expect(normalizeBetterTextProperties({ textStyleClassName: 'arbitrary-class' }).textStyleClassName).toBe('');
    expect(normalizeBetterTextProperties({}).textStyleClassName).toBe('');
  });
});
