const assert = require('assert');
const { extractBvid, normalizeUrl } = require('../server');

const cases = [
  { input: 'BV1GJ411x7h7', expected: 'BV1GJ411X7H7' },
  { input: 'https://www.bilibili.com/video/BV1GJ411x7h7', expected: 'BV1GJ411X7H7' },
  { input: 'https://www.bilibili.com/video/BV1GJ411x7h7?p=1', expected: 'BV1GJ411X7H7' },
  { input: 'b23.tv/abcd123', expected: null }
];

cases.forEach(c => {
  assert.strictEqual(extractBvid(c.input), c.expected);
});

assert.strictEqual(normalizeUrl('b23.tv/abcd123'), 'https://b23.tv/abcd123');
assert.strictEqual(normalizeUrl('https://b23.tv/abcd123'), 'https://b23.tv/abcd123');

process.stdout.write('ok\n');
