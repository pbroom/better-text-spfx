import * as React from 'react';
import * as ReactDom from 'react-dom';
import { DisplayMode, Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  IPropertyPaneField,
  PropertyPaneFieldType
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import {
  BetterTextProperties,
  betterTextRootClassName,
  createBetterTextControlCss,
  createBetterTextCss,
  createBetterTextInstanceClass,
  createBetterTextStyleVariables,
  defaultBetterTextProperties,
  discoverBetterTextCustomStyles,
  normalizeBetterTextProperties,
  parseBetterTextPropertiesFromCss,
  syncBetterTextCssFromProperties
} from '../../shared/text';
import { ensureGoogleFontLoaded } from '../../shared/googleFonts';
import { BetterTextPropertyPane } from './components/BetterTextPropertyPane';
import { RichTextEditor } from './components/RichTextEditor';

export interface IBetterTextWebPartProps extends BetterTextProperties {}

interface IPropertyPaneCustomFieldProps {
  key: string;
  context?: unknown;
  onRender: (
    domElement: HTMLElement,
    context?: unknown,
    changeCallback?: (targetProperty?: string, newValue?: unknown, isValidEntry?: boolean) => void
  ) => void;
  onDispose?: (domElement: HTMLElement, context?: unknown) => void;
}

export default class BetterTextWebPart extends BaseClientSideWebPart<IBetterTextWebPartProps> {
  private _shadowContainer: HTMLElement | undefined;

  public render(): void {
    const properties = parseBetterTextPropertiesFromCss(
      this.properties.customCss || createBetterTextControlCss(this.properties),
      this.properties
    );
    const customStyles = discoverBetterTextCustomStyles(properties.customCss);

    ensureGoogleFontLoaded(properties.fontFamily);

    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    const container = document.createElement('div');

    style.textContent = createBetterTextCss(properties.customCss);
    shadow.appendChild(style);
    shadow.appendChild(container);

    this._disposeShadowContainer();
    this.domElement.innerHTML = '';
    this.domElement.appendChild(host);
    this._shadowContainer = container;

    ReactDom.render(
      React.createElement(
        'div',
        {
          className: betterTextRootClassName(properties),
          style: createBetterTextStyleVariables(properties)
        },
        React.createElement(RichTextEditor, {
          ariaLabel: 'Better Text content',
          className: properties.textStyleClassName,
          customStyles,
          editable: this.displayMode === DisplayMode.Edit,
          value: properties.content,
          onChange: (content: string): void => {
            this.properties.content = content;
          }
        })
      ),
      container
    );
  }

  protected onDispose(): void {
    this._disposeShadowContainer();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected onInit(): Promise<void> {
    const properties = normalizeBetterTextProperties({
      content: this.properties.content === undefined ? defaultBetterTextProperties.content : this.properties.content,
      textStyleClassName: this.properties.textStyleClassName || defaultBetterTextProperties.textStyleClassName,
      fontFamily: this.properties.fontFamily || defaultBetterTextProperties.fontFamily,
      fontSize:
        this.properties.fontSize === undefined ? defaultBetterTextProperties.fontSize : this.properties.fontSize,
      fontSizeUnit: this.properties.fontSizeUnit || defaultBetterTextProperties.fontSizeUnit,
      fontWeight:
        this.properties.fontWeight === undefined ? defaultBetterTextProperties.fontWeight : this.properties.fontWeight,
      lineHeight:
        this.properties.lineHeight === undefined ? defaultBetterTextProperties.lineHeight : this.properties.lineHeight,
      letterSpacing:
        this.properties.letterSpacing === undefined
          ? defaultBetterTextProperties.letterSpacing
          : this.properties.letterSpacing,
      letterSpacingUnit: this.properties.letterSpacingUnit || defaultBetterTextProperties.letterSpacingUnit,
      instanceClassName: this.properties.instanceClassName || createBetterTextInstanceClass(this._getInstanceClassSeed()),
      customCss: this.properties.customCss
    });

    this._assignProperties(properties);
    this.properties.customCss = syncBetterTextCssFromProperties(properties.customCss, properties);

    return Promise.resolve();
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): void {
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);

    if (!isBetterTextProperty(propertyPath)) {
      return;
    }

    if (propertyPath === 'customCss' && typeof newValue === 'string') {
      const properties = parseBetterTextPropertiesFromCss(newValue, this.properties);
      this._assignProperties(properties);
      this.properties.customCss = newValue;
      this.render();
      return;
    }

    const properties = normalizeBetterTextProperties(this.properties);
    this._assignProperties(properties);
    this.properties.customCss = syncBetterTextCssFromProperties(this.properties.customCss, properties);
    this.render();
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          groups: [
            {
              groupFields: [this._createCustomPropertyPaneField()]
            }
          ]
        }
      ]
    };
  }

  private _createCustomPropertyPaneField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return createPropertyPaneCustomField({
      key: 'better-text-custom-property-pane',
      onRender: (
        domElement: HTMLElement,
        _context?: unknown,
        changeCallback?: (targetProperty?: string, newValue?: unknown, isValidEntry?: boolean) => void
      ): void => {
        ReactDom.render(
          React.createElement(BetterTextPropertyPane, {
            properties: normalizeBetterTextProperties(this.properties),
            onChange: (properties): void => this._applyPropertyPaneProperties(properties, changeCallback)
          }),
          domElement
        );
      },
      onDispose: (domElement: HTMLElement): void => {
        ReactDom.unmountComponentAtNode(domElement);
      }
    });
  }

  private _applyPropertyPaneProperties(
    properties: BetterTextProperties,
    changeCallback?: (targetProperty?: string, newValue?: unknown, isValidEntry?: boolean) => void
  ): void {
    const previous = normalizeBetterTextProperties(this.properties);
    const normalized = normalizeBetterTextProperties(properties);
    this._assignProperties(normalized);
    this.properties.customCss = normalized.customCss;

    ([
      'content',
      'textStyleClassName',
      'fontFamily',
      'fontSize',
      'fontSizeUnit',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'letterSpacingUnit',
      'instanceClassName',
      'customCss'
    ] as Array<keyof BetterTextProperties>).forEach((propertyPath) => {
      if (previous[propertyPath] !== normalized[propertyPath]) {
        changeCallback?.(propertyPath, normalized[propertyPath], true);
      }
    });

    this.render();
  }

  private _getInstanceClassSeed(): string {
    return (
      (this as unknown as { instanceId?: string }).instanceId ||
      (this.context as unknown as { instanceId?: string }).instanceId ||
      `${this.context.manifest.id}-${this.context.manifest.alias}`
    );
  }

  private _assignProperties(properties: BetterTextProperties): void {
    this.properties.content = properties.content;
    this.properties.textStyleClassName = properties.textStyleClassName;
    this.properties.fontFamily = properties.fontFamily;
    this.properties.fontSize = properties.fontSize;
    this.properties.fontSizeUnit = properties.fontSizeUnit;
    this.properties.fontWeight = properties.fontWeight;
    this.properties.lineHeight = properties.lineHeight;
    this.properties.letterSpacing = properties.letterSpacing;
    this.properties.letterSpacingUnit = properties.letterSpacingUnit;
    this.properties.instanceClassName = properties.instanceClassName;
  }

  private _disposeShadowContainer(): void {
    if (this._shadowContainer) {
      ReactDom.unmountComponentAtNode(this._shadowContainer);
      this._shadowContainer = undefined;
    }
  }
}

function isBetterTextProperty(propertyPath: string): boolean {
  return (
    propertyPath === 'content' ||
    propertyPath === 'textStyleClassName' ||
    propertyPath === 'fontFamily' ||
    propertyPath === 'fontSize' ||
    propertyPath === 'fontSizeUnit' ||
    propertyPath === 'fontWeight' ||
    propertyPath === 'lineHeight' ||
    propertyPath === 'letterSpacing' ||
    propertyPath === 'letterSpacingUnit' ||
    propertyPath === 'instanceClassName' ||
    propertyPath === 'customCss'
  );
}

function createPropertyPaneCustomField(
  properties: IPropertyPaneCustomFieldProps
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return {
    type: PropertyPaneFieldType.Custom,
    targetProperty: 'customCss',
    properties
  };
}
