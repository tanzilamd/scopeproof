import { mkdir, writeFile } from 'node:fs/promises';
import { createBackboard, OPEN_WEIGHT_MODELS } from '../lib/backboard.mjs';
import { FIXTURES } from '../test/live-fixtures.mjs';

if (!process.env.BACKBOARD_API_KEY) throw new Error('BACKBOARD_API_KEY is missing. Set it securely, never in source.');
const headers = { 'X-API-Key': process.env.BACKBOARD_API_KEY };
async function balance() {
  const r = await fetch('https://app.backboard.io/api/billing/balance', { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Cannot verify balance: HTTP ${r.status}`);
  const d = await r.json(); return { balanceUsd: d.balance_usd, paidCreditUsd: d.paid_credit_usd, freeCreditUsd: d.free_credit_usd, autoReloadEnabled: d.auto_reload_enabled };
}
const before = await balance();
if (before.balanceUsd < 0.5 || before.autoReloadEnabled !== false) throw new Error('Evaluation requires at least $0.50 credit and auto-reload disabled. No settings were changed.');
const selected = (process.env.EVAL_MODELS || 'qwen/qwen3-32b,qwen/qwen3.5-9b').split(',');
if (selected.some(m => !Object.hasOwn(OPEN_WEIGHT_MODELS, m))) throw new Error('Only explicitly allowlisted open-weight models may be evaluated.');
const report = { startedAt: new Date().toISOString(), note:'Synthetic small-set live evaluation, not a general accuracy benchmark. No automatic retries. Expected labels hand-authored before inference.', before, runs: [] };
for (const model of selected) {
  for (const fixture of FIXTURES) {
    const run = { model, fixture: fixture.name, input: fixture.input, expected: fixture.expected };
    try {
      const result = await createBackboard({ env: { ...process.env, BACKBOARD_MODEL:model, LIVE_ANALYSIS_ENABLED:'true' } })(fixture.input);
      Object.assign(run, result, { actual: result.rows.map(r => r.decision) });
      run.correct = run.actual.filter((v,i) => v === run.expected[i]).length;
      console.log(`${model} · ${fixture.name}: ${run.correct}/${run.expected.length}; ${result.meta.latencyMs}ms`);
    } catch (error) { run.error = error.message; process.exitCode = 1; console.log(`${model} · ${fixture.name}: FAILED: ${error.message}`); }
    report.runs.push(run);
  }
}
report.after = await balance(); report.observedBalanceDeltaUsd = Number((report.before.balanceUsd - report.after.balanceUsd).toFixed(8));
report.finishedAt = new Date().toISOString();
const usage = await fetch('https://app.backboard.io/api/billing/usage/recent?page_size=100', { headers, signal: AbortSignal.timeout(20000) });
if (usage.ok) {
  const data = await usage.json();
  report.billingEvents = (data.data || []).filter(e => selected.includes(e.model) && Date.parse(e.date.endsWith('Z') ? e.date : e.date+'Z') >= Date.parse(report.startedAt)).map(e => Object.fromEntries(['date','model','input_tokens','output_tokens','amount_deducted_usd','credit_type'].map(k => [k,e[k]])));
}
await mkdir('docs/evidence', { recursive:true });
await writeFile('docs/evidence/live-evaluation.json', JSON.stringify(report,null,2)+'\n');
console.log(`Observed account balance delta during evaluation: $${report.observedBalanceDeltaUsd}. Evidence: docs/evidence/live-evaluation.json`);
if (report.runs.some(r => r.correct !== r.expected.length)) process.exitCode = 1;
