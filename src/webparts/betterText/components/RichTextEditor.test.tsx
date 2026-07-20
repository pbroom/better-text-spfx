/// <reference types="jest" />

import {
  applyBetterTextBlockStyleToRange,
  sanitizeRichTextHtml
} from './RichTextEditor';

describe('Better Text block styles', () => {
  it('applies a style to the current block for a collapsed selection', () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<p class="existing bt-style--old">Alpha <strong>beta</strong></p>';
    const text = scope.querySelector('strong')?.firstChild as Text;
    const range = {
      collapsed: true,
      startContainer: text
    } as unknown as Range;

    expect(applyBetterTextBlockStyleToRange(scope, range, 'bt-style--lede')).toBe(true);
    expect(scope.innerHTML).toBe('<p class="existing bt-style--lede">Alpha <strong>beta</strong></p>');
  });

  it('applies a style to every block intersecting a selection', () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<p>Alpha</p><h2 class="keep">Beta</h2>';
    const range = {
      collapsed: false,
      intersectsNode: (node: Node) => scope.contains(node)
    } as unknown as Range;

    expect(applyBetterTextBlockStyleToRange(scope, range, 'bt-style--feature-title')).toBe(true);
    expect(scope.innerHTML).toBe(
      '<p class="bt-style--feature-title">Alpha</p>'
      + '<h2 class="keep bt-style--feature-title">Beta</h2>'
    );
  });

  it('styles only leaf blocks when a selection intersects nested blocks', () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<blockquote><p>Alpha</p></blockquote><ul><li><p>Beta</p></li></ul>';
    const range = {
      collapsed: false,
      intersectsNode: (node: Node) => scope.contains(node)
    } as unknown as Range;

    expect(applyBetterTextBlockStyleToRange(scope, range, 'bt-style--callout')).toBe(true);
    expect(scope.innerHTML).toBe(
      '<blockquote><p class="bt-style--callout">Alpha</p></blockquote>'
      + '<ul><li><p class="bt-style--callout">Beta</p></li></ul>'
    );
  });

  it('clears only Better Text preset classes and ignores invalid requested classes', () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<p class="keep bt-style--lede">Alpha</p>';
    const range = {
      collapsed: false,
      intersectsNode: (node: Node) => scope.contains(node)
    } as unknown as Range;

    expect(applyBetterTextBlockStyleToRange(scope, range, 'arbitrary-class')).toBe(false);
    expect(scope.innerHTML).toBe('<p class="keep bt-style--lede">Alpha</p>');
    expect(applyBetterTextBlockStyleToRange(scope, range, '')).toBe(true);
    expect(scope.innerHTML).toBe('<p class="keep">Alpha</p>');
  });

  it('retains preset classes when sanitizing persisted rich text', () => {
    expect(sanitizeRichTextHtml(
      '<p class="bt-style--lede" onclick="alert(1)">Alpha</p>'
    )).toBe('<p class="bt-style--lede">Alpha</p>');
  });
});
