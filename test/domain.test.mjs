import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE, sampleRows, validateInput, validateResult, calculateQuote, makeReply, makeReport } from '../public/domain.mjs';

test('sample explicitly covers included, exclusions, revision limit and ambiguity', () => {
  assert.deepEqual(sampleRows().map(r => r.decision), ['Included', 'Extra work', 'Extra work', 'Extra work', 'Needs clarification']);
  for (const row of sampleRows().filter(r => r.quote)) assert.ok(SAMPLE.scope.includes(row.quote));
});
for (const [name, input] of [
  ['empty scope', { ...SAMPLE, scope: '' }], ['oversized scope', { ...SAMPLE, scope: 'x'.repeat(6001) }],
  ['too many requests', { ...SAMPLE, requests: Array(9).fill('request') }], ['long request', { ...SAMPLE, requests: ['x'.repeat(501)] }],
  ['empty request', { ...SAMPLE, requests: [' '] }], ['invalid types', { scope: 3, requests: 'one' }], ['long project', { ...SAMPLE, project: 'x'.repeat(101) }]
]) test(`input rejects ${name}`, () => assert.throws(() => validateInput(input)));
test('input trims surrounding whitespace but preserves evidence text', () => {
  const input = validateInput({ ...SAMPLE, scope: `  ${SAMPLE.scope}  ` }); assert.equal(input.scope, SAMPLE.scope);
});
const raw = () => ({ results: sampleRows().map(r => ({ id: r.id, decision: r.suggested, reason: r.reason, quote: r.quote })) });
for (const [name, mutate] of [
  ['missing result', data => data.results.pop()], ['duplicate id', data => data.results[1].id = 1],
  ['wrong classification', data => data.results[0].decision = 'Approved'], ['noninteger id', data => data.results[0].id = '1'],
  ['oversized reason', data => data.results[0].reason = 'x'.repeat(601)], ['missing quote field', data => delete data.results[0].quote]
]) test(`result rejects ${name}`, () => { const data = raw(); mutate(data); assert.throws(() => validateResult(data, SAMPLE)); });
test('invalid JSON is rejected rather than repaired', () => assert.throws(() => validateResult('```json\n{}\n```', SAMPLE)));
test('invented and paraphrased quotations are removed and decision downgraded', () => {
  const data = raw(); data.results[0].quote = 'Contact forms are always free.';
  const result = validateResult(data, SAMPLE)[0]; assert.equal(result.quote, null); assert.equal(result.decision, 'Needs clarification'); assert.match(result.evidence, /removed/);
});
test('unsupported included/extra decisions become clarification', () => {
  const data = raw(); data.results[0].quote = null; assert.equal(validateResult(data, SAMPLE)[0].decision, 'Needs clarification');
});
test('shuffled results are restored to request order, model request text is ignored', () => {
  const data = raw(); data.results.reverse(); data.results[0].request = 'tampered'; assert.deepEqual(validateResult(data, SAMPLE).map(r => r.request), SAMPLE.requests);
});
test('exact-match check is case-sensitive and does not normalize model quotes', () => {
  const data = raw(); data.results[0].quote = 'WITH A CONTACT ENQUIRY FORM'; assert.equal(validateResult(data, SAMPLE)[0].quote, null);
});
test('decimal arithmetic, rounding and overrides use only user decisions', () => {
  const rows = sampleRows(); rows[1].hours = '1.25'; rows[2].hours = '2'; rows[3].hours = '.5';
  assert.throws(() => calculateQuote(rows, '50', 'USD')); rows[3].hours = '0.5';
  let q = calculateQuote(rows, '19.99', 'USD'); assert.equal(q.totalMinor, 7497); // round each line to cents before summing
  rows[1].decision = 'Included'; q = calculateQuote(rows, '19.99', 'USD'); assert.equal(q.totalMinor, 4998);
  assert.ok(makeReply(SAMPLE, rows, q).includes('Proposed additional total: $49.98'));
});
test('missing hours produce incomplete estimate, no invented total', () => {
  const rows = sampleRows(), q = calculateQuote(rows, '50', 'USD'); assert.equal(q.complete, false); assert.equal(q.items[0].amountMinor, null); assert.match(makeReply(SAMPLE, rows, q), /quote is incomplete/);
});
test('zero estimates are explicit and permitted', () => {
  const rows = sampleRows(); rows.filter(r => r.decision === 'Extra work').forEach(r => r.hours = '0'); const q = calculateQuote(rows, '0', 'USD'); assert.equal(q.complete, true); assert.equal(q.totalMinor, 0);
});
for (const value of ['-1', 'NaN', 'Infinity', '1e4', '1.001', '100001', '']) test(`rate rejects ${JSON.stringify(value)}`, () => assert.throws(() => calculateQuote(sampleRows(), value, 'USD')));
for (const value of ['-1', '1001', 'NaN', '1.001']) test(`hours reject ${value}`, () => { const rows = sampleRows(); rows[1].hours = value; assert.throws(() => calculateQuote(rows, '50', 'USD')); });
test('JPY and KWD respect currency minor units', () => {
  const rows = [{ id: 1, decision: 'Extra work', hours: '1.25' }]; assert.equal(calculateQuote(rows, '100', 'JPY').totalMinor, 125); assert.equal(calculateQuote(rows, '1.125', 'KWD').totalMinor, 1406); assert.throws(() => calculateQuote(rows, '100.1', 'JPY')); assert.throws(() => calculateQuote(rows, '50', 'ZZZ'));
});
test('report distinguishes sample, override, incomplete estimate and edited reply', () => {
  const rows = sampleRows(); rows[0].decision = 'Extra work'; const q = calculateQuote(rows, '50', 'USD'); const text = makeReport(SAMPLE, rows, q, 'My edited client reply', { mode: 'sample', at: 'test' });
  assert.match(text, /ILLUSTRATIVE SAMPLE/); assert.match(text, /overridden/); assert.match(text, /Total: incomplete/); assert.match(text, /My edited client reply/); assert.match(text, /Nothing was sent/);
});
