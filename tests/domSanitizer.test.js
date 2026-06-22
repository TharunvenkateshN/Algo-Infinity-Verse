import test from 'node:test';
import assert from 'node:assert';
import { escapeHtml, sanitizeHTML } from '../modules/domSanitizer.js';

test('DOMSanitizer - escapeHtml', async (t) => {
  await t.test('escapes basic HTML characters', () => {
    assert.strictEqual(escapeHtml('<script>alert("hello")</script>'), '&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('Hello & Welcome'), 'Hello &amp; Welcome');
    assert.strictEqual(escapeHtml("John's Book"), 'John&#39;s Book');
  });

  await t.test('handles null and undefined', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  await t.test('handles non-string inputs', () => {
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(true), 'true');
  });
});

test('DOMSanitizer - sanitizeHTML', async (t) => {
  await t.test('removes script tags', () => {
    const input = '<div>Hello <script>alert(1)</script>World</div>';
    const expected = '<div>Hello World</div>';
    assert.strictEqual(sanitizeHTML(input), expected);
  });

  await t.test('strips onerror and other event handlers', () => {
    const input = '<img src="x" onerror="alert(1)" onload="javascript:alert(2)">';
    const expected = '<img src="x">';
    assert.strictEqual(sanitizeHTML(input), expected);
  });

  await t.test('removes javascript: URIs', () => {
    const input = '<a href="javascript:alert(1)">Click here</a>';
    const expected = '<a>Click here</a>';
    assert.strictEqual(sanitizeHTML(input), expected);
  });

  await t.test('preserves allowed tags and safe attributes', () => {
    const input = '<div class="test" id="main"><b>Bold text</b></div>';
    assert.strictEqual(sanitizeHTML(input), input);
  });

  await t.test('handles null and undefined', () => {
    assert.strictEqual(sanitizeHTML(null), '');
    assert.strictEqual(sanitizeHTML(undefined), '');
  });
});
