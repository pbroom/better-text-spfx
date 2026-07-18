# Better Text

SPFx 1.21.1 web part project managed by SPFx Kit.

A rich text web part like SharePoint's default Text web part, plus:

- Formatting toolbar (text styles, bold/italic/underline/strikethrough, lists, indent, links, alignment, clear formatting) rendered inline on the canvas.
- Font picker for the full Google Fonts catalog (bundled in `src/shared/googleFontsCatalog.ts`, no API key needed). Fonts load via a deduped `fonts.googleapis.com/css2` stylesheet link.
- Line height (leading) and letter spacing controls.
- Custom CSS/SCSS editor (Monaco) with bidirectional sync: changing controls rewrites the `.better-text__content` rule, and editing the CSS updates the controls. Same architecture as Better Divider (`src/shared/text.ts`).

## Regenerating the font catalog

```sh
node scripts/generate-google-fonts-catalog.mjs
```

## Build

```sh
npm install
npm run build   # gulp bundle
npm run ship    # production package
```

Monaco assets for the property pane editor are copied with `node scripts/copy-monaco-assets.mjs`.
