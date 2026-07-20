/// <reference types="jest" />

import {
  createBetterTextControlCss,
  defaultBetterTextProperties,
  normalizeBetterTextProperties,
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
  letter-spacing: -1%;
}
`);

    expect(properties.fontFamily).toBe('Open Sans');
    expect(properties.fontSize).toBe(24);
    expect(properties.fontSizeUnit).toBe('px');
    expect(properties.fontWeight).toBe(700);
    expect(properties.letterSpacing).toBe(-1);
    expect(properties.letterSpacingUnit).toBe('%');
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
  });
});
