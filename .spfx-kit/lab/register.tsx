import * as React from 'react';
import type {
  LabPropertyBag,
  LabRenderProps,
  LabWebPart,
  LabWebPartRegistry
} from '@spfx-kit/spfx-lab-runtime';
import {
  BetterTextProperties,
  betterTextFontSizeRange,
  betterTextFontWeightOptions,
  betterTextLetterSpacingRange,
  betterTextLineHeightRange,
  betterTextRootClassName,
  createBetterTextControlCss,
  createBetterTextCss,
  createBetterTextCustomStyleLabel,
  createBetterTextCssTargetComment,
  createBetterTextCssTargets,
  createBetterTextInstanceClass,
  createBetterTextStyleVariables,
  defaultBetterTextProperties,
  discoverBetterTextCustomStyles,
  normalizeBetterTextInstanceClassName,
  normalizeBetterTextProperties,
  parseBetterTextPropertiesFromCss,
  renameBetterTextInstanceClassInCss,
  syncBetterTextCssFromProperties
} from '../../src/shared/text';
import { createGoogleFontPickerOptions, ensureGoogleFontLoaded } from '../../src/shared/googleFonts';
import { RichTextEditor } from '../../src/webparts/betterText/components/RichTextEditor';
import './betterTextLab.css';

type BetterTextLabProps = LabPropertyBag & BetterTextProperties;

const labInstanceClassName = createBetterTextInstanceClass('better-text-spfx:better-text:lab');
const fontPickerOptions = createGoogleFontPickerOptions();

const defaultProps: BetterTextLabProps = {
  ...defaultBetterTextProperties,
  content:
    '<p>Start writing with <strong>Better Text</strong>. Use the toolbar to format, pick any Google font, and fine-tune leading and letter spacing.</p>',
  instanceClassName: labInstanceClassName,
  customCss: createBetterTextControlCss({
    ...defaultBetterTextProperties,
    instanceClassName: labInstanceClassName
  })
};

const BetterTextLabPreview: React.FunctionComponent<LabRenderProps<BetterTextLabProps>> = ({ props, updateProps }) => {
  const text = props.customCss
    ? parseBetterTextPropertiesFromCss(props.customCss, props)
    : normalizeBetterTextProperties(props);

  React.useEffect(() => {
    ensureGoogleFontLoaded(text.fontFamily);
  }, [text.fontFamily]);

  const rootStyle: React.CSSProperties = {
    ...createBetterTextStyleVariables(text)
  };
  const customStyles = React.useMemo(
    () => discoverBetterTextCustomStyles(text.customCss),
    [text.customCss]
  );

  return (
    <section className="better-text-lab-preview">
      <style>{createBetterTextCss(text.customCss)}</style>
      <div className={`${betterTextRootClassName(text)} better-text-lab-web-part`} style={rootStyle}>
        <RichTextEditor
          ariaLabel="Better Text content"
          className={text.textStyleClassName}
          customStyles={customStyles}
          editable
          value={text.content}
          onChange={(content) => updateProps({ content })}
        />
      </div>
    </section>
  );
};

const webPart: LabWebPart<BetterTextLabProps> = {
  id: 'better-text-spfx:better-text',
  appId: 'better-text-spfx',
  title: 'Better Text',
  description:
    'A rich text web part with Google Fonts, leading and letter spacing controls, and synced custom CSS.',
  defaultProps,
  controls: [
    {
      type: 'select',
      name: 'textStyleClassName',
      label: 'Text style',
      description: 'Define .bt-style--name in Custom CSS/SCSS to add presets.',
      options: [{ label: 'Default', value: '' }],
      getOptions: createTextStyleOptions,
      getPatch: (value, values) => createControlPatch('textStyleClassName', value, values)
    },
    {
      type: 'combobox',
      name: 'fontFamily',
      label: 'Font',
      placeholder: 'Search fonts',
      options: fontPickerOptions,
      getPatch: (value, values) => createControlPatch('fontFamily', value, values)
    },
    {
      type: 'number',
      name: 'fontSize',
      label: 'Font size',
      inlineGroup: 'text-font',
      min: betterTextFontSizeRange.min,
      max: betterTextFontSizeRange.max,
      step: betterTextFontSizeRange.step,
      getUnit: (values) => normalizeBetterTextProperties(values).fontSizeUnit,
      getPatch: (value, values) => createControlPatch('fontSize', value, values)
    },
    {
      type: 'select',
      name: 'fontWeight',
      label: 'Font weight',
      inlineGroup: 'text-font',
      options: betterTextFontWeightOptions.map((option) => ({
        label: option.label,
        value: option.value
      })),
      getPatch: (value, values) => createControlPatch('fontWeight', value, values)
    },
    {
      type: 'number',
      name: 'lineHeight',
      label: 'Line height',
      inlineGroup: 'text-typography',
      min: betterTextLineHeightRange.min,
      max: betterTextLineHeightRange.max,
      step: betterTextLineHeightRange.step,
      unit: '×',
      getPatch: (value, values) => createControlPatch('lineHeight', value, values)
    },
    {
      type: 'number',
      name: 'letterSpacing',
      label: 'Letter spacing',
      inlineGroup: 'text-typography',
      min: betterTextLetterSpacingRange.min,
      max: betterTextLetterSpacingRange.max,
      step: betterTextLetterSpacingRange.step,
      getUnit: (values) => normalizeBetterTextProperties(values).letterSpacingUnit,
      getPatch: (value, values) => createControlPatch('letterSpacing', value, values)
    },
    {
      type: 'sourceEditor',
      name: 'customCss',
      label: 'Custom CSS/SCSS',
      language: 'scss',
      commitMode: 'immediate',
      minHeight: 190,
      getValue: (values) => String(values.customCss || ''),
      getPatch: (value, values) => createCssPatch(String(value || ''), values),
      getTargets: (values) => createBetterTextCssTargets(normalizeBetterTextProperties(values)),
      getTargetComment: (values) =>
        createBetterTextCssTargetComment(normalizeBetterTextProperties(values).instanceClassName),
      getTargetRenamePatch: (_target, nextSelector, nextValue, values) =>
        createInstanceClassRenamePatch(nextSelector, nextValue, values)
    }
  ],
  supportedBreakpoints: ['one-column', 'two-third', 'one-half', 'one-third', 'mobile'],
  fixtures: {},
  render: BetterTextLabPreview
};

export function register(registry: LabWebPartRegistry): void {
  registry.register(webPart);
}

function createTextStyleOptions(values: LabPropertyBag): Array<{ label: string; value: string }> {
  const properties = normalizeBetterTextProperties(values);
  const options = discoverBetterTextCustomStyles(properties.customCss).map((style) => ({
    label: style.label,
    value: style.className
  }));
  if (
    properties.textStyleClassName
    && !options.some((option) => option.value === properties.textStyleClassName)
  ) {
    options.push({
      label: `${createBetterTextCustomStyleLabel(properties.textStyleClassName)} (unavailable)`,
      value: properties.textStyleClassName
    });
  }
  return [{ label: 'Default', value: '' }, ...options];
}

function createControlPatch(
  name: keyof BetterTextProperties,
  value: LabPropertyBag[string],
  values: LabPropertyBag
): LabPropertyBag {
  const nextProperties = normalizeBetterTextProperties({
    ...values,
    [name]: value
  });
  return {
    ...nextProperties,
    customCss: syncBetterTextCssFromProperties(String(values.customCss || ''), nextProperties)
  };
}

function createCssPatch(value: string, values: LabPropertyBag): LabPropertyBag {
  const nextProperties = parseBetterTextPropertiesFromCss(value, values);
  return {
    ...nextProperties,
    customCss: value
  };
}

function createInstanceClassRenamePatch(
  nextSelector: string,
  nextValue: string,
  values: LabPropertyBag
): LabPropertyBag {
  const currentProperties = normalizeBetterTextProperties(values);
  const nextInstanceClassName = normalizeBetterTextInstanceClassName(
    nextSelector,
    currentProperties.instanceClassName
  );
  const customCss = renameBetterTextInstanceClassInCss(
    nextValue,
    currentProperties.instanceClassName,
    nextInstanceClassName
  );
  const nextProperties = parseBetterTextPropertiesFromCss(customCss, {
    ...values,
    instanceClassName: nextInstanceClassName
  });

  return {
    ...nextProperties,
    instanceClassName: nextInstanceClassName,
    customCss
  };
}
