import * as React from 'react';
import { Combobox, FluentProvider, Option, webLightTheme } from '@fluentui/react-components';

import {
  BetterTextProperties,
  betterTextLetterSpacingRange,
  betterTextLineHeightRange,
  createBetterTextCssTargetComment,
  createBetterTextCssTargets,
  normalizeBetterTextInstanceClassName,
  normalizeBetterTextProperties,
  parseBetterTextPropertiesFromCss,
  renameBetterTextInstanceClassInCss,
  syncBetterTextCssFromProperties
} from '../../../shared/text';
import {
  createGoogleFontPickerOptions,
  ensureGoogleFontLoaded,
  filterGoogleFontPickerOptions,
  themeDefaultFontLabel
} from '../../../shared/googleFonts';
import {
  SourceEditorField,
  SourceEditorTarget
} from '../../../vendor/source-editor/SourceEditorField';

export interface BetterTextPropertyPaneProps {
  properties: BetterTextProperties;
  onChange: (properties: BetterTextProperties) => void;
}

const fontPickerOptions = createGoogleFontPickerOptions();

export const BetterTextPropertyPane: React.FunctionComponent<BetterTextPropertyPaneProps> = (props) => {
  const [values, setValues] = React.useState<BetterTextProperties>(() =>
    normalizeBetterTextProperties(props.properties)
  );

  React.useEffect(() => {
    setValues(normalizeBetterTextProperties(props.properties));
  }, [props.properties]);

  const applyValues = (nextValues: BetterTextProperties): void => {
    setValues(nextValues);
    props.onChange(nextValues);
  };

  const applyControlPatch = (patch: Partial<BetterTextProperties>): void => {
    const nextValues = normalizeBetterTextProperties({ ...values, ...patch });
    nextValues.customCss = syncBetterTextCssFromProperties(values.customCss, nextValues);
    applyValues(nextValues);
  };

  const applyCustomCss = (customCss: string): void => {
    const parsed = parseBetterTextPropertiesFromCss(customCss, values);
    applyValues({ ...parsed, customCss });
  };

  const renameTarget = (_target: SourceEditorTarget, nextSelector: string, nextValue: string): void => {
    const nextInstanceClassName = normalizeBetterTextInstanceClassName(nextSelector, values.instanceClassName);
    const customCss = renameBetterTextInstanceClassInCss(nextValue, values.instanceClassName, nextInstanceClassName);
    const parsed = parseBetterTextPropertiesFromCss(customCss, {
      ...values,
      instanceClassName: nextInstanceClassName
    });

    applyValues({
      ...parsed,
      customCss,
      instanceClassName: nextInstanceClassName
    });
  };

  return (
    <FluentProvider className="bt-property-pane__provider" theme={webLightTheme}>
      <div className="bt-property-pane">
        <style>{propertyPaneCss}</style>
        <section className="bt-property-pane__section">
          <FontFamilyField
            value={values.fontFamily}
            onChange={(fontFamily) => {
              ensureGoogleFontLoaded(fontFamily);
              applyControlPatch({ fontFamily });
            }}
          />
          <div className="bt-property-pane__field-row">
            <NumberField
              label="Line height"
              max={betterTextLineHeightRange.max}
              min={betterTextLineHeightRange.min}
              step={betterTextLineHeightRange.step}
              unit="×"
              value={values.lineHeight}
              onChange={(lineHeight) => applyControlPatch({ lineHeight })}
            />
            <NumberField
              label="Letter spacing"
              max={betterTextLetterSpacingRange.max}
              min={betterTextLetterSpacingRange.min}
              step={betterTextLetterSpacingRange.step}
              unit="px"
              value={values.letterSpacing}
              onChange={(letterSpacing) => applyControlPatch({ letterSpacing })}
            />
          </div>
          <SourceEditorField
            label="Custom CSS/SCSS"
            language="scss"
            value={values.customCss}
            config={{
              commitMode: 'immediate',
              targetComment: createBetterTextCssTargetComment(values.instanceClassName),
              targets: createBetterTextCssTargets(values),
              onTargetRename: renameTarget
            }}
            onChange={applyCustomCss}
          />
        </section>
      </div>
    </FluentProvider>
  );
};

interface FontFamilyFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const FontFamilyField: React.FunctionComponent<FontFamilyFieldProps> = (props) => {
  const [query, setQuery] = React.useState<string | undefined>(undefined);
  const displayValue = query !== undefined ? query : props.value || themeDefaultFontLabel;
  const visibleOptions = filterGoogleFontPickerOptions(fontPickerOptions, query || '');

  return (
    <div className="bt-property-pane__field">
      <span className="bt-property-pane__label">Font</span>
      <Combobox
        aria-label="Font"
        className="bt-property-pane__font-combobox"
        placeholder="Search fonts"
        value={displayValue}
        selectedOptions={[props.value]}
        onBlur={() => setQuery(undefined)}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onOptionSelect={(_event, data) => {
          setQuery(undefined);
          props.onChange(data.optionValue ?? '');
        }}
      >
        {visibleOptions.map((option) => (
          <Option key={option.value || 'theme-default'} text={option.label} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Combobox>
    </div>
  );
};

interface NumberFieldProps {
  label: string;
  max: number;
  min: number;
  step: number;
  unit: string;
  value: number;
  onChange: (value: number) => void;
}

const NumberField: React.FunctionComponent<NumberFieldProps> = (props) => (
  <label className="bt-property-pane__field">
    <span className="bt-property-pane__label">{props.label}</span>
    <span className="bt-property-pane__number-wrap">
      <input
        aria-label={`${props.label} (${props.unit})`}
        className="bt-property-pane__input bt-property-pane__input--number"
        max={props.max}
        min={props.min}
        step={props.step}
        type="number"
        value={props.value}
        onChange={(event) => {
          const value = Number(event.currentTarget.value);
          if (Number.isFinite(value)) {
            props.onChange(value);
          }
        }}
      />
      <span className="bt-property-pane__unit">{props.unit}</span>
    </span>
  </label>
);

const propertyPaneCss = `.bt-property-pane__provider {
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.bt-property-pane {
  box-sizing: border-box;
  color: #242424;
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.bt-property-pane *,
.bt-property-pane *::before,
.bt-property-pane *::after {
  box-sizing: border-box;
}

.bt-property-pane__section {
  display: grid;
  gap: 12px;
  padding: 0 0 16px;
  border-bottom: 1px solid #edebe9;
}

.bt-property-pane__field {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.bt-property-pane__field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: 8px;
}

.bt-property-pane__label {
  color: #424242;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.bt-property-pane__font-combobox {
  width: 100%;
  min-width: 0;
}

.bt-property-pane__input {
  width: 100%;
  min-width: 0;
  min-height: 32px;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  padding: 5px 8px;
  color: #242424;
  background: #ffffff;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}

.bt-property-pane__input:focus {
  border-color: #0f6cbd;
  outline: 2px solid rgb(15 108 189 / 24%);
  outline-offset: 1px;
}

.bt-property-pane__number-wrap {
  position: relative;
  display: block;
  min-width: 0;
}

.bt-property-pane__input--number {
  padding-right: 30px;
}

.bt-property-pane__unit {
  position: absolute;
  top: 50%;
  right: 9px;
  color: #616161;
  font-size: 12px;
  line-height: 1;
  pointer-events: none;
  transform: translateY(-50%);
}

@media (max-width: 260px) {
  .bt-property-pane__field-row {
    grid-template-columns: 1fr;
  }
}`;
