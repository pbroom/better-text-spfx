import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSourceDiagnostics,
  measureSourceBytes,
  shouldCommitSource
} from '../src/vendor/source-editor/sourceEditorCore.ts';

test('measures source as UTF-8 bytes', () => {
  assert.equal(measureSourceBytes('abc'), 3);
  assert.equal(measureSourceBytes('é'), 2);
  assert.equal(measureSourceBytes('😀'), 4);
});

test('adds an error when source exceeds the byte limit', () => {
  assert.deepEqual(getSourceDiagnostics('abcd', 3), [
    {
      level: 'error',
      message: 'Source is larger than the 3 bytes limit.'
    }
  ]);
});

test('preserves validator diagnostics before the byte-limit diagnostic', () => {
  const diagnostics = getSourceDiagnostics('abcd', 3, () => [
    {
      level: 'warning',
      message: 'Review this source.'
    }
  ]);

  assert.deepEqual(diagnostics.map((diagnostic) => diagnostic.level), ['warning', 'error']);
});

test('valid-only commits allow warnings and reject errors', () => {
  assert.equal(
    shouldCommitSource('valid', [{ level: 'warning', message: 'Review this source.' }]),
    true
  );
  assert.equal(
    shouldCommitSource('valid', [{ level: 'error', message: 'Invalid source.' }]),
    false
  );
  assert.equal(
    shouldCommitSource('immediate', [{ level: 'error', message: 'Invalid source.' }]),
    true
  );
  assert.equal(
    shouldCommitSource(undefined, [{ level: 'error', message: 'Invalid source.' }]),
    true
  );
});
