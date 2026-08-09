import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../../../vendor/source-editor/ui-profile/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../vendor/source-editor/ui-profile/components/ui/select";
import {
  useSpfxUiDerivedId,
  useSpfxUiId,
} from "../../../vendor/source-editor/ui-profile/lib/ui-root";

import {
  BetterTextCustomStyle,
  BetterTextProperties,
  betterTextFontSizeRange,
  betterTextFontWeightOptions,
  betterTextLetterSpacingRange,
  betterTextLineHeightRange,
  createBetterTextCustomStyleLabel,
  createBetterTextCssTargetComment,
  createBetterTextCssTargets,
  discoverBetterTextCustomStyles,
  normalizeBetterTextInstanceClassName,
  normalizeBetterTextProperties,
  parseBetterTextPropertiesFromCss,
  renameBetterTextInstanceClassInCss,
  syncBetterTextCssFromProperties,
} from "../../../shared/text";
import {
  createGoogleFontPickerOptions,
  ensureGoogleFontLoaded,
  filterGoogleFontPickerOptions,
  themeDefaultFontLabel,
} from "../../../shared/googleFonts";
import {
  SourceEditorField,
  SourceEditorTarget,
} from "../../../vendor/source-editor/SourceEditorField";

export interface BetterTextPropertyPaneProps {
  instanceId: string;
  properties: BetterTextProperties;
  onChange: (properties: BetterTextProperties) => void;
}

const fontPickerOptions = createGoogleFontPickerOptions();

export const BetterTextPropertyPane: React.FunctionComponent<
  BetterTextPropertyPaneProps
> = (props) => {
  const [values, setValues] = React.useState<BetterTextProperties>(() =>
    normalizeBetterTextProperties(props.properties),
  );

  React.useEffect(() => {
    setValues(normalizeBetterTextProperties(props.properties));
  }, [props.properties]);

  const customStyles = React.useMemo(
    () => discoverBetterTextCustomStyles(values.customCss),
    [values.customCss],
  );

  const applyValues = (nextValues: BetterTextProperties): void => {
    setValues(nextValues);
    props.onChange(nextValues);
  };

  const applyControlPatch = (patch: Partial<BetterTextProperties>): void => {
    const nextValues = normalizeBetterTextProperties({ ...values, ...patch });
    nextValues.customCss = syncBetterTextCssFromProperties(
      values.customCss,
      nextValues,
    );
    applyValues(nextValues);
  };

  const applyCustomCss = (customCss: string): void => {
    const parsed = parseBetterTextPropertiesFromCss(customCss, values);
    applyValues({ ...parsed, customCss });
  };

  const renameTarget = (
    _target: SourceEditorTarget,
    nextSelector: string,
    nextValue: string,
  ): void => {
    const nextInstanceClassName = normalizeBetterTextInstanceClassName(
      nextSelector,
      values.instanceClassName,
    );
    const customCss = renameBetterTextInstanceClassInCss(
      nextValue,
      values.instanceClassName,
      nextInstanceClassName,
    );
    const parsed = parseBetterTextPropertiesFromCss(customCss, {
      ...values,
      instanceClassName: nextInstanceClassName,
    });

    applyValues({
      ...parsed,
      customCss,
      instanceClassName: nextInstanceClassName,
    });
  };

  return (
    <div className="bt-property-pane">
      <style>{propertyPaneCss}</style>
      <section className="bt-property-pane__section">
        <TextStyleField
          customStyles={customStyles}
          value={values.textStyleClassName}
          onChange={(textStyleClassName) =>
            applyControlPatch({ textStyleClassName })
          }
        />
        <FontFamilyField
          value={values.fontFamily}
          onChange={(fontFamily) => {
            ensureGoogleFontLoaded(fontFamily);
            applyControlPatch({ fontFamily });
          }}
        />
        <div className="bt-property-pane__field-row">
          <NumberField
            label="Font size"
            max={betterTextFontSizeRange.max}
            min={betterTextFontSizeRange.min}
            step={betterTextFontSizeRange.step}
            unit={values.fontSizeUnit}
            value={values.fontSize}
            onChange={(fontSize) => applyControlPatch({ fontSize })}
          />
          <FontWeightField
            value={values.fontWeight}
            onChange={(fontWeight) => applyControlPatch({ fontWeight })}
          />
        </div>
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
            unit={values.letterSpacingUnit}
            value={values.letterSpacing}
            onChange={(letterSpacing) => applyControlPatch({ letterSpacing })}
          />
        </div>
        <SourceEditorField
          instanceId={`${props.instanceId}:custom-css`}
          label="Custom CSS/SCSS"
          language="scss"
          value={values.customCss}
          config={{
            commitMode: "immediate",
            targetComment: createBetterTextCssTargetComment(
              values.instanceClassName,
            ),
            targets: createBetterTextCssTargets(values),
            onTargetRename: renameTarget,
          }}
          onChange={applyCustomCss}
        />
      </section>
    </div>
  );
};

interface TextStyleFieldProps {
  customStyles: readonly BetterTextCustomStyle[];
  value: string;
  onChange: (value: string) => void;
}

const TextStyleField: React.FunctionComponent<TextStyleFieldProps> = (
  props,
) => {
  const selectedStyle = props.customStyles.find(
    (style) => style.className === props.value,
  );
  const selectedLabel =
    selectedStyle?.label ||
    (props.value
      ? `${createBetterTextCustomStyleLabel(props.value)} (unavailable)`
      : "Default");
  const controlId = useSpfxUiId("text-style");
  const contentId = useSpfxUiDerivedId(controlId, "popup");
  const labelId = useSpfxUiDerivedId(controlId, "label");
  const options = React.useMemo(() => {
    const available = [
      { label: "Default", value: "" },
      ...props.customStyles.map((style) => ({
        label: style.label,
        value: style.className,
      })),
    ];
    if (props.value && !selectedStyle) {
      available.push({ label: selectedLabel, value: props.value });
    }
    return available;
  }, [props.customStyles, props.value, selectedLabel, selectedStyle]);
  return (
    <div className="bt-property-pane__field">
      <span className="bt-property-pane__label" id={labelId}>
        Text style
      </span>
      <Select
        id={controlId}
        value={props.value || null}
        onValueChange={(value) =>
          props.onChange(value === null ? "" : String(value))
        }
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="bt-property-pane__dropdown"
        >
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent id={contentId} align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value || "__default__"}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <span className="bt-property-pane__hint">
        Define <code>.bt-style--name</code> in Custom CSS/SCSS to add presets.
      </span>
    </div>
  );
};

interface FontWeightFieldProps {
  value: number;
  onChange: (value: number) => void;
}

const FontWeightField: React.FunctionComponent<FontWeightFieldProps> = (
  props,
) => {
  const selectedValue = String(props.value);
  const selectedOption = betterTextFontWeightOptions.find(
    (option) => option.value === selectedValue,
  );
  const controlId = useSpfxUiId("font-weight");
  const contentId = useSpfxUiDerivedId(controlId, "popup");
  const labelId = useSpfxUiDerivedId(controlId, "label");

  return (
    <div className="bt-property-pane__field">
      <span className="bt-property-pane__label" id={labelId}>
        Font weight
      </span>
      <Select
        id={controlId}
        value={selectedValue}
        onValueChange={(nextValue) => {
          const value = Number(nextValue);
          if (Number.isFinite(value)) {
            props.onChange(value);
          }
        }}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="bt-property-pane__dropdown"
        >
          <SelectValue>{selectedOption?.label || selectedValue}</SelectValue>
        </SelectTrigger>
        <SelectContent id={contentId} align="start">
          <SelectGroup>
            {betterTextFontWeightOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

interface FontFamilyFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const FontFamilyField: React.FunctionComponent<FontFamilyFieldProps> = (
  props,
) => {
  const [query, setQuery] = React.useState<string | undefined>(undefined);
  const displayValue =
    query !== undefined ? query : props.value || themeDefaultFontLabel;
  const visibleOptions = filterGoogleFontPickerOptions(
    fontPickerOptions,
    query || "",
  );
  const controlId = useSpfxUiId("font-family");
  const contentId = useSpfxUiDerivedId(controlId, "popup");
  const labelId = useSpfxUiDerivedId(controlId, "label");
  const itemValues = React.useMemo(
    () => fontPickerOptions.map((option) => option.value),
    [],
  );
  const labelsByValue = React.useMemo(
    () =>
      new Map(fontPickerOptions.map((option) => [option.value, option.label])),
    [],
  );

  return (
    <div className="bt-property-pane__field">
      <span className="bt-property-pane__label" id={labelId}>
        Font
      </span>
      <Combobox
        id={controlId}
        inputValue={displayValue}
        items={itemValues}
        itemToStringLabel={(itemValue) =>
          labelsByValue.get(itemValue) || itemValue
        }
        value={props.value || null}
        onInputValueChange={(nextQuery) => setQuery(nextQuery)}
        onOpenChange={(open) => {
          if (!open) setQuery(undefined);
        }}
        onValueChange={(nextValue) => {
          setQuery(undefined);
          if (nextValue !== null) props.onChange(String(nextValue));
        }}
      >
        <ComboboxInput
          aria-labelledby={labelId}
          className="bt-property-pane__font-combobox"
          placeholder="Search fonts"
          showClear={Boolean(query)}
        />
        <ComboboxContent id={contentId}>
          <ComboboxList>
            <ComboboxGroup>
              {visibleOptions.map((option) => (
                <ComboboxItem
                  key={option.value || "theme-default"}
                  value={option.value}
                >
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
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
  <NumberFieldControl {...props} />
);

const NumberFieldControl: React.FunctionComponent<NumberFieldProps> = (
  props,
) => {
  const controlId = useSpfxUiId(`number:${props.label}`);
  return (
    <label className="bt-property-pane__field" htmlFor={controlId}>
      <span className="bt-property-pane__label">{props.label}</span>
      <span className="bt-property-pane__number-wrap">
        <input
          aria-label={`${props.label} (${props.unit})`}
          className="bt-property-pane__input bt-property-pane__input--number"
          id={controlId}
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
};

const propertyPaneCss = `.bt-property-pane {
  box-sizing: border-box;
  color: var(--spfx-ui-color-foreground);
  font-family: var(--spfx-ui-font-heading);
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
  border-bottom: 1px solid var(--spfx-ui-color-border);
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
  color: var(--spfx-ui-color-foreground);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.bt-property-pane__hint {
  color: var(--spfx-ui-color-muted-foreground);
  font-size: 11px;
  line-height: 15px;
}

.bt-property-pane__hint code {
  font-family: Consolas, "Courier New", monospace;
}

.bt-property-pane__font-combobox {
  width: 100%;
  min-width: 0;
}

.bt-property-pane__dropdown {
  width: 100%;
  min-width: 0;
}

.bt-property-pane__input {
  width: 100%;
  min-width: 0;
  min-height: 32px;
  border: 1px solid var(--spfx-ui-color-input);
  border-radius: var(--spfx-ui-radius-md);
  padding: 5px 8px;
  color: var(--spfx-ui-color-foreground);
  background: var(--spfx-ui-color-background);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}

.bt-property-pane__input:focus {
  border-color: var(--spfx-ui-color-ring);
  outline: 2px solid color-mix(in srgb, var(--spfx-ui-color-ring) 24%, transparent);
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
  color: var(--spfx-ui-color-muted-foreground);
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
