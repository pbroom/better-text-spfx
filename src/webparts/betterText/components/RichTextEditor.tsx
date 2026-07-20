import * as React from 'react';
import {
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  ListIndentDecreaseIcon,
  ListIndentIncreaseIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextClearIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  Unlink01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { betterTextFontWeightOptions } from '../../../shared/text';

export interface RichTextEditorProps {
  value: string;
  editable: boolean;
  ariaLabel?: string;
  className?: string;
  onChange?: (html: string) => void;
}

interface ToolbarCommand {
  id: string;
  title: string;
  command: string;
  icon: IconSvgElement;
  stateCommand?: string;
}

const inlineCommands: ToolbarCommand[] = [
  { id: 'bold', title: 'Bold', command: 'bold', icon: TextBoldIcon, stateCommand: 'bold' },
  { id: 'italic', title: 'Italic', command: 'italic', icon: TextItalicIcon, stateCommand: 'italic' },
  { id: 'underline', title: 'Underline', command: 'underline', icon: TextUnderlineIcon, stateCommand: 'underline' },
  {
    id: 'strikethrough',
    title: 'Strikethrough',
    command: 'strikeThrough',
    icon: TextStrikethroughIcon,
    stateCommand: 'strikeThrough'
  }
];

const listCommands: ToolbarCommand[] = [
  {
    id: 'ul',
    title: 'Bulleted list',
    command: 'insertUnorderedList',
    icon: LeftToRightListBulletIcon,
    stateCommand: 'insertUnorderedList'
  },
  {
    id: 'ol',
    title: 'Numbered list',
    command: 'insertOrderedList',
    icon: LeftToRightListNumberIcon,
    stateCommand: 'insertOrderedList'
  },
  { id: 'outdent', title: 'Decrease indent', command: 'outdent', icon: ListIndentDecreaseIcon },
  { id: 'indent', title: 'Increase indent', command: 'indent', icon: ListIndentIncreaseIcon }
];

const alignCommands: ToolbarCommand[] = [
  { id: 'align-left', title: 'Align left', command: 'justifyLeft', icon: TextAlignLeftIcon, stateCommand: 'justifyLeft' },
  {
    id: 'align-center',
    title: 'Align center',
    command: 'justifyCenter',
    icon: TextAlignCenterIcon,
    stateCommand: 'justifyCenter'
  },
  { id: 'align-right', title: 'Align right', command: 'justifyRight', icon: TextAlignRightIcon, stateCommand: 'justifyRight' }
];

const blockFormats = [
  { label: 'Normal text', value: 'p' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' }
];

export const RichTextEditor: React.FunctionComponent<RichTextEditorProps> = (props) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const changeTimerRef = React.useRef<number | undefined>(undefined);
  const selectionRangeRef = React.useRef<Range | null>(null);
  const latestHtmlRef = React.useRef(props.value);
  const valueRef = React.useRef(props.value);
  valueRef.current = props.value;
  const [activeStates, setActiveStates] = React.useState<Record<string, boolean>>({});
  const [blockFormat, setBlockFormat] = React.useState('p');
  const [fontWeight, setFontWeight] = React.useState('400');
  const [linkEditorOpen, setLinkEditorOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('https://');
  const [linkError, setLinkError] = React.useState('');

  // Stable identity so React only invokes this on mount/unmount of the div,
  // not on every render (which would reset innerHTML and the cursor).
  const attachContent = React.useCallback((element: HTMLDivElement | null): void => {
    contentRef.current = element;
    if (element) {
      const sanitized = sanitizeRichTextHtml(valueRef.current);
      latestHtmlRef.current = sanitized;
      element.innerHTML = sanitized;
    }
  }, []);

  const emitChange = React.useCallback((): void => {
    const element = contentRef.current;
    if (!element || !props.onChange) {
      return;
    }
    const html = element.innerHTML;
    if (html === latestHtmlRef.current) {
      return;
    }
    latestHtmlRef.current = html;
    props.onChange(html);
  }, [props.onChange]);

  const scheduleChange = React.useCallback((): void => {
    if (typeof window === 'undefined') {
      return;
    }
    window.clearTimeout(changeTimerRef.current);
    changeTimerRef.current = window.setTimeout(emitChange, 300);
  }, [emitChange]);

  const flushChange = React.useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(changeTimerRef.current);
    }
    emitChange();
  }, [emitChange]);

  React.useEffect(() => () => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(changeTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const sanitized = sanitizeRichTextHtml(props.value);
    if (sanitized !== element.innerHTML && props.value !== latestHtmlRef.current) {
      latestHtmlRef.current = sanitized;
      element.innerHTML = sanitized;
    }
  }, [props.value]);

  const rememberEditorSelection = React.useCallback((): void => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const selection = getSelectionForScope(element);
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (rangeBelongsToScope(range, element)) {
      selectionRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreEditorSelection = React.useCallback((): Selection | null => {
    const element = contentRef.current;
    if (!element) {
      return null;
    }
    element.focus();
    const selection = getSelectionForScope(element);
    const range = selectionRangeRef.current;
    if (!selection || !range || !rangeBelongsToScope(range, element)) {
      return selection;
    }
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      selectionRangeRef.current = null;
    }
    return selection;
  }, []);

  const refreshToolbarState = React.useCallback((): void => {
    if (typeof document === 'undefined') {
      return;
    }
    const nextStates: Record<string, boolean> = {};
    [...inlineCommands, ...listCommands, ...alignCommands].forEach((item) => {
      if (!item.stateCommand) {
        return;
      }
      try {
        nextStates[item.id] = document.queryCommandState(item.stateCommand);
      } catch {
        nextStates[item.id] = false;
      }
    });
    setActiveStates(nextStates);
    setBlockFormat(readSelectionBlockFormat(contentRef.current));
    setFontWeight(readSelectionFontWeight(contentRef.current));
  }, []);

  const runCommand = (command: string, value?: string): void => {
    restoreEditorSelection();
    try {
      document.execCommand(command, false, value);
    } catch {
      // execCommand is deprecated but universally supported; ignore failures.
    }
    rememberEditorSelection();
    refreshToolbarState();
    scheduleChange();
  };

  const applyBlockFormat = (value: string): void => {
    runCommand('formatBlock', `<${value}>`);
    setBlockFormat(value);
  };

  const applyFontWeight = (value: string): void => {
    const element = contentRef.current;
    const selection = restoreEditorSelection();
    if (!element || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      refreshToolbarState();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!rangeBelongsToScope(range, element)) {
      refreshToolbarState();
      return;
    }

    const fragment = range.extractContents();
    applyFontWeightToFragment(fragment, value);
    const insertedNodes = Array.from(fragment.childNodes);
    range.insertNode(fragment);
    if (insertedNodes.length) {
      range.setStartBefore(insertedNodes[0]);
      range.setEndAfter(insertedNodes[insertedNodes.length - 1]);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRangeRef.current = range.cloneRange();
    setFontWeight(value);
    scheduleChange();
  };

  const openLinkEditor = (): void => {
    rememberEditorSelection();
    setLinkUrl('https://');
    setLinkError('');
    setLinkEditorOpen(true);
  };

  const applyLink = (): void => {
    const safeUrl = sanitizeUrl(linkUrl);
    if (!safeUrl) {
      setLinkError('Enter a valid web, email, phone, relative, or anchor link.');
      return;
    }
    const selection = restoreEditorSelection();
    if (selection?.isCollapsed) {
      const escapedUrl = escapeHtml(safeUrl);
      runCommand('insertHTML', `<a href="${escapedUrl}">${escapedUrl}</a>`);
    } else {
      runCommand('createLink', safeUrl);
    }
    setLinkEditorOpen(false);
    setLinkError('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      rememberEditorSelection();
      openLinkEditor();
    }
  };

  const handleSelectionChange = (): void => {
    rememberEditorSelection();
    refreshToolbarState();
  };

  const clearFormatting = (): void => {
    runCommand('removeFormat');
    runCommand('formatBlock', '<p>');
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const payload = html ? sanitizeRichTextHtml(html) : escapeHtml(text).replace(/\r?\n/g, '<br>');
    try {
      document.execCommand('insertHTML', false, payload);
    } catch {
      document.execCommand('insertText', false, text);
    }
    scheduleChange();
  };

  if (!props.editable) {
    return (
      <div
        className={`better-text__content ${props.className || ''}`.trim()}
        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(props.value) }}
      />
    );
  }

  return (
    <div className="better-text-editor">
      <style>{richTextEditorCss}</style>
      <div className="better-text-editor__toolbar" role="toolbar" aria-label="Text formatting">
        <select
          aria-label="Text style"
          className="better-text-editor__select"
          value={blockFormat}
          onMouseDown={() => rememberEditorSelection()}
          onChange={(event) => applyBlockFormat(event.currentTarget.value)}
        >
          {blockFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Font weight"
          className="better-text-editor__select better-text-editor__select--weight"
          title="Font weight"
          value={fontWeight}
          onMouseDown={() => rememberEditorSelection()}
          onChange={(event) => applyFontWeight(event.currentTarget.value)}
        >
          {betterTextFontWeightOptions.map((weight) => (
            <option key={weight.value} value={weight.value}>
              {weight.label}
            </option>
          ))}
        </select>
        <span className="better-text-editor__divider" />
        {inlineCommands.map((item) => (
          <ToolbarButton key={item.id} item={item} active={Boolean(activeStates[item.id])} onRun={runCommand} />
        ))}
        <span className="better-text-editor__divider" />
        {listCommands.map((item) => (
          <ToolbarButton key={item.id} item={item} active={Boolean(activeStates[item.id])} onRun={runCommand} />
        ))}
        <span className="better-text-editor__divider" />
        {alignCommands.map((item) => (
          <ToolbarButton key={item.id} item={item} active={Boolean(activeStates[item.id])} onRun={runCommand} />
        ))}
        <span className="better-text-editor__divider" />
        <button
          aria-label="Insert link"
          className="better-text-editor__button"
          title="Insert link (Ctrl/Cmd+K)"
          type="button"
          onMouseDown={(event) => {
            rememberEditorSelection();
            event.preventDefault();
          }}
          aria-controls="better-text-link-editor"
          aria-expanded={linkEditorOpen}
          onClick={openLinkEditor}
        >
          <HugeiconsIcon aria-hidden="true" icon={Link01Icon} size={16} strokeWidth={1.7} />
        </button>
        <button
          aria-label="Remove link"
          className="better-text-editor__button"
          title="Remove link"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('unlink')}
        >
          <HugeiconsIcon aria-hidden="true" icon={Unlink01Icon} size={16} strokeWidth={1.7} />
        </button>
        <button
          aria-label="Clear formatting"
          className="better-text-editor__button"
          title="Clear formatting"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearFormatting}
        >
          <HugeiconsIcon aria-hidden="true" icon={TextClearIcon} size={16} strokeWidth={1.7} />
        </button>
      </div>
      {linkEditorOpen && (
        <form
          className="better-text-editor__link-editor"
          id="better-text-link-editor"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            aria-label="Link address"
            autoFocus
            className="better-text-editor__link-input"
            inputMode="url"
            placeholder="https://example.com"
            type="text"
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.currentTarget.value);
              setLinkError('');
            }}
          />
          <button className="better-text-editor__link-action" type="submit">
            Apply link
          </button>
          <button
            className="better-text-editor__link-action"
            type="button"
            onClick={() => {
              setLinkEditorOpen(false);
              setLinkError('');
              restoreEditorSelection();
            }}
          >
            Cancel
          </button>
          {linkError && <span className="better-text-editor__link-error">{linkError}</span>}
        </form>
      )}
      <div
        aria-label={props.ariaLabel || 'Rich text editor'}
        className={`better-text__content better-text-editor__surface ${props.className || ''}`.trim()}
        contentEditable
        ref={attachContent}
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onBlur={flushChange}
        onInput={scheduleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        onPaste={handlePaste}
        onSelect={handleSelectionChange}
      />
    </div>
  );
};

interface ToolbarButtonProps {
  item: ToolbarCommand;
  active: boolean;
  onRun: (command: string) => void;
}

const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({ item, active, onRun }) => (
  <button
    aria-label={item.title}
    aria-pressed={active}
    className={`better-text-editor__button better-text-editor__button--${item.id} ${
      active ? 'better-text-editor__button--active' : ''
    }`.trim()}
    title={item.title}
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => onRun(item.command)}
  >
    <HugeiconsIcon aria-hidden="true" icon={item.icon} size={16} strokeWidth={1.7} />
  </button>
);

const blockedTags = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
  'LINK',
  'META',
  'BASE',
  'TITLE',
  'HEAD',
  'AUDIO',
  'VIDEO',
  'SOURCE',
  'TRACK'
]);

export function sanitizeRichTextHtml(html: string | undefined): string {
  if (!html || typeof document === 'undefined') {
    return html || '';
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

function sanitizeNode(root: ParentNode): void {
  const elements = Array.from(root.querySelectorAll('*'));

  elements.forEach((element) => {
    if (blockedTags.has(element.tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }
      if ((name === 'href' || name === 'src') && !sanitizeUrl(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

function sanitizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readSelectionBlockFormat(scope: HTMLElement | null): string {
  if (typeof window === 'undefined' || !scope) {
    return 'p';
  }
  const selection = getSelectionForScope(scope);
  let node = selection?.anchorNode || null;

  while (node && node !== scope) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
        return tag;
      }
      if (tag === 'p') {
        return 'p';
      }
    }
    node = node.parentNode;
  }

  return 'p';
}

function readSelectionFontWeight(scope: HTMLElement | null): string {
  if (typeof window === 'undefined' || !scope) {
    return '400';
  }
  const selection = getSelectionForScope(scope);
  const anchorNode = selection?.anchorNode;
  if (!anchorNode || !scope.contains(anchorNode)) {
    return '400';
  }
  const element = anchorNode.nodeType === Node.ELEMENT_NODE
    ? anchorNode as HTMLElement
    : anchorNode.parentElement;
  if (!element) {
    return '400';
  }
  const computed = window.getComputedStyle(element).fontWeight;
  if (computed === 'normal') {
    return '400';
  }
  if (computed === 'bold') {
    return '700';
  }
  const numeric = Number.parseInt(computed, 10);
  if (!Number.isFinite(numeric)) {
    return '400';
  }
  return betterTextFontWeightOptions.reduce((closest, option) => (
    Math.abs(Number(option.value) - numeric) < Math.abs(Number(closest) - numeric)
      ? option.value
      : closest
  ), '400');
}

function rangeBelongsToScope(range: Range, scope: HTMLElement): boolean {
  const container = range.commonAncestorContainer;
  return container === scope || scope.contains(container);
}

function applyFontWeightToFragment(fragment: DocumentFragment, value: string): void {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current.textContent) {
      textNodes.push(current as Text);
    }
    current = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const span = document.createElement('span');
    span.style.fontWeight = value;
    textNode.parentNode?.insertBefore(span, textNode);
    span.appendChild(textNode);
  });
}

function getSelectionForScope(scope: HTMLElement): Selection | null {
  const rootNode = scope.getRootNode() as Document | ShadowRoot;
  const shadowSelection = (rootNode as unknown as { getSelection?: () => Selection | null }).getSelection;
  if (typeof shadowSelection === 'function') {
    return shadowSelection.call(rootNode);
  }
  return window.getSelection();
}

const richTextEditorCss = `.better-text-editor {
  display: grid;
  gap: 6px;
}

.better-text-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  border: 1px solid #d1d1d1;
  border-radius: 6px;
  padding: 4px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.better-text-editor__select {
  height: 26px;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 4px;
  color: #323130;
  background: transparent;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  cursor: pointer;
}

.better-text-editor__select:hover,
.better-text-editor__select:focus-visible {
  border-color: #c7c7c7;
  background: #f5f5f5;
  outline: none;
}

.better-text-editor__select--weight {
  width: 112px;
}

.better-text-editor__divider {
  width: 1px;
  height: 18px;
  margin: 0 3px;
  background: #e1dfdd;
}

.better-text-editor__link-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #d1d1d1;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.better-text-editor__link-input {
  min-width: 220px;
  flex: 1 1 260px;
  height: 28px;
  border: 1px solid #8a8886;
  border-radius: 4px;
  padding: 0 8px;
  color: #323130;
  font: inherit;
}

.better-text-editor__link-input:focus-visible {
  border-color: #0078d4;
  outline: 1px solid #0078d4;
}

.better-text-editor__link-action {
  height: 28px;
  border: 1px solid #c7c7c7;
  border-radius: 4px;
  padding: 0 10px;
  color: #323130;
  background: #ffffff;
  cursor: pointer;
}

.better-text-editor__link-action:hover,
.better-text-editor__link-action:focus-visible {
  border-color: #0078d4;
  outline: none;
}

.better-text-editor__link-error {
  flex-basis: 100%;
  color: #a4262c;
  font-size: 12px;
}

.better-text-editor__button {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 5px;
  color: #323130;
  background: transparent;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.better-text-editor__button:hover,
.better-text-editor__button:focus-visible {
  border-color: #c7c7c7;
  background: #f5f5f5;
  outline: none;
}

.better-text-editor__button--active {
  border-color: #0078d4;
  color: #0078d4;
  background: #eff6fc;
}

.better-text-editor__surface {
  min-height: 48px;
  border: 1px dashed transparent;
  border-radius: 4px;
  outline: none;
}

.better-text-editor__surface:hover {
  border-color: #c7c7c7;
}

.better-text-editor__surface:focus {
  border-color: #0078d4;
}`;
