import { DECISIONS, SAMPLE, validateInput, sampleRows, calculateQuote, makeReply, makeReport, money } from './domain.mjs';
const $ = id => document.getElementById(id);
let state = null, busy = false, generation = 0, editedReply = false, quote = null;
const requests = () => $('requests').value.split('\n').map(x => x.trim()).filter(Boolean);
const message = (id, text) => { $(id).textContent = text; $(id).hidden = !text; };
function counters() { $('scope-count').textContent = `${$('scope').value.length.toLocaleString('en')} / 6,000`; $('request-count').textContent = `${requests().length} / 8`; }
function invalidate() {
  generation++;
  if (state) { state = null; quote = null; $('results').hidden = true; $('empty').hidden = false; $('review-source').hidden = true; $('review-rows').replaceChildren(); $('reply').value = ''; $('print-report').textContent = ''; message('notice', 'The agreement or requests changed. Run a new review to keep the evidence and report current.'); }
  message('error', ''); counters();
}
['project', 'scope', 'requests'].forEach(id => $(id).addEventListener('input', invalidate));
function elem(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function setBusy(value) {
  busy = value; $('analyze').disabled = value;
  $('analyze').textContent = value ? 'Reviewing the agreement…' : 'Analyze with AI ↗';
  document.querySelector('.review-panel').setAttribute('aria-busy', String(value));
  ['sample', 'sample-top', 'sample-empty'].forEach(id => $(id).disabled = value);
}
function showReview(input, rows, meta) {
  state = { input, rows, meta }; editedReply = false;
  $('results').hidden = false; $('empty').hidden = true; $('review-source').hidden = false;
  $('review-source').textContent = meta.mode === 'sample' ? 'Illustrative sample' : 'Live AI';
  message('error', '');
  message('notice', meta.mode === 'sample' ? 'ILLUSTRATIVE SAMPLE · Prewritten results, not live AI. No input was sent. Sample estimates are blank; enter your own hours.' : 'Live AI suggestions are ready. Check the quotes and choose your own decisions.');
  renderRows(); updateQuote(); $('review-summary').focus({ preventScroll: true });
  $('analysis-meta').textContent = meta.mode === 'sample' ? 'Sample only · No model call, token usage or provider cost.' : `Model: ${meta.model} · ${meta.provider} · ${(meta.latencyMs / 1000).toFixed(1)}s · Input tokens: ${meta.inputTokens ?? 'not reported'} · Output tokens: ${meta.outputTokens ?? 'not reported'} · Provider cost: not reported here.`;
}
function renderRows() {
  const container = $('review-rows'); container.replaceChildren();
  $('review-summary').textContent = `${state.rows.length} requests · ${state.rows.filter(r => r.decision === 'Included').length} included · ${state.rows.filter(r => r.decision === 'Extra work').length} extra · ${state.rows.filter(r => r.decision === 'Needs clarification').length} to clarify`;
  for (const row of state.rows) {
    const article = elem('article', undefined, 'review-row');
    const title = elem('div', undefined, 'request-title'); title.append(elem('span', String(row.id).padStart(2, '0')), elem('h4', row.request)); article.append(title);
    article.append(elem('span', row.suggested, `badge ${row.suggested === 'Included' ? 'included' : row.suggested === 'Extra work' ? 'extra' : 'clarification'}`), elem('p', row.reason, 'review-reason'));
    if (row.quote) article.append(elem('blockquote', `“${row.quote}”`, 'evidence'));
    article.append(elem('p', `${row.quote ? '✓ ' : '○ '}${row.evidence}`, `evidence-note${row.quote ? '' : ' missing'}`));
    const controls = elem('div', undefined, 'decision-controls');
    const selectWrap = elem('div'); const selectId = `decision-${row.id}`;
    const label = elem('label', 'Your decision'); label.htmlFor = selectId;
    const select = elem('select'); select.id = selectId;
    DECISIONS.forEach(d => { const option = elem('option', d); option.value = d; select.append(option); }); select.value = row.decision;
    select.addEventListener('change', () => { row.decision = select.value; renderRows(); updateQuote(); $(`decision-${row.id}`).focus(); });
    selectWrap.append(label, select); controls.append(selectWrap);
    if (row.decision === 'Extra work') {
      const wrap = elem('div', undefined, 'hours-control'); const hoursId = `hours-${row.id}`;
      const hoursLabel = elem('label', 'Est. hours'); hoursLabel.htmlFor = hoursId;
      const input = elem('input'); input.id = hoursId; input.type = 'number'; input.min = '0'; input.max = '1000'; input.step = '.01'; input.inputMode = 'decimal'; input.placeholder = 'Not set'; input.value = row.hours;
      input.addEventListener('input', () => { row.hours = input.validity.badInput ? 'invalid' : input.value; updateQuote(); });
      wrap.append(hoursLabel, input); controls.append(wrap);
    }
    article.append(controls);
    if (row.decision !== row.suggested) article.append(elem('p', `You changed the suggestion from “${row.suggested}”.`, 'override-note'));
    container.append(article);
  }
}
function updateReport() {
  if (!state || !quote) return;
  $('print-report').textContent = makeReport(state.input, state.rows, quote, $('reply').value, state.meta);
}
function updateQuote() {
  if (!state) return;
  try {
    quote = calculateQuote(state.rows, $('rate').validity.badInput ? 'invalid' : $('rate').value, $('currency').value);
    message('quote-error', '');
    $('quote-total').textContent = quote.complete ? money(quote.totalMinor, quote) : 'Incomplete';
    $('quote-detail').textContent = quote.items.length ? quote.complete ? `${quote.items.length} extra-work estimates · subject to client approval` : 'Enter hours for every extra-work request.' : 'No extra work selected.';
    ['copy', 'export', 'print', 'regenerate'].forEach(id => $(id).disabled = false);
    if (!editedReply) { $('reply').value = makeReply(state.input, state.rows, quote); $('reply-status').textContent = 'Template only. Nothing is sent automatically.'; }
    else $('reply-status').textContent = 'Your edited reply is preserved. Decisions or estimates changed; check it or refresh the template before sharing.';
    updateReport();
  } catch (error) {
    quote = null; message('quote-error', error.message); $('quote-total').textContent = 'Check inputs'; $('quote-detail').textContent = 'Fix the estimate before copying or exporting.'; $('print-report').textContent = '';
    ['copy', 'export', 'print', 'regenerate'].forEach(id => $(id).disabled = true);
  }
}
['rate', 'currency'].forEach(id => $(id).addEventListener('input', updateQuote));
$('currency').addEventListener('change', () => { $('rate').step = $('currency').value === 'JPY' ? '1' : $('currency').value === 'KWD' ? '.001' : '.01'; });
$('reply').addEventListener('input', () => { editedReply = true; $('reply-status').textContent = 'Your edited reply is included in the report. Nothing is sent automatically.'; updateReport(); });
$('regenerate').addEventListener('click', () => { if (!state || !quote) return; if (editedReply && !window.confirm('Replace your edited reply with the current template?')) return; editedReply = false; updateQuote(); });
function loadSample() {
  if (busy) return;
  generation++;
  $('project').value = SAMPLE.project; $('scope').value = SAMPLE.scope; $('requests').value = SAMPLE.requests.join('\n'); $('consent').checked = false; $('rate').value = '50'; $('currency').value = 'USD'; counters();
  showReview({ ...SAMPLE, requests: [...SAMPLE.requests] }, sampleRows(), { mode: 'sample', at: new Date().toISOString() });
  $('workspace').scrollIntoView({ block: 'start', behavior: 'instant' });
}
['sample', 'sample-top', 'sample-empty'].forEach(id => $(id).addEventListener('click', () => { if (state && state.meta.mode !== 'sample' && !window.confirm('Replace the current review with the sample?')) return; loadSample(); }));
$('review-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  let input;
  try { input = validateInput({ project: $('project').value, scope: $('scope').value, requests: requests() }); if (!$('consent').checked) throw new Error('Check the consent box before sending text for live analysis.'); }
  catch (error) { message('error', error.message); return; }
  const current = ++generation; setBusy(true); message('error', ''); message('notice', 'Comparing requests with your agreement. This can take up to a minute.');
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(75000) });
    const data = await response.json(); if (current !== generation) { message('notice', 'Inputs changed during analysis. The stale result was discarded. Run a new review.'); return; }
    if (!response.ok) throw new Error(data.error || 'Analysis failed. Please try later.');
    showReview(input, data.rows, data.meta);
  } catch (error) { if (current === generation) { message('notice', ''); message('error', error.name === 'TimeoutError' ? 'The request timed out. No automatic retry was made. The provider may still bill this attempt.' : error.message); } }
  finally { setBusy(false); checkStatus(); }
});
$('reset').addEventListener('click', () => {
  if (($('scope').value || state) && !window.confirm('Clear the agreement, requests, review and reply? Download a report first if needed.')) return;
  generation++; state = null; quote = null; editedReply = false; $('review-form').reset(); $('rate').value = '50'; $('currency').value = 'USD'; $('results').hidden = true; $('empty').hidden = false; $('review-source').hidden = true; $('review-rows').replaceChildren(); $('reply').value = ''; $('print-report').textContent = ''; message('notice', ''); message('error', ''); counters(); $('project').focus();
});
$('copy').addEventListener('click', async () => {
  if (!state || !quote) return;
  try { await navigator.clipboard.writeText($('reply').value); message('notice', 'Reply copied. Review it before sending to your client.'); }
  catch { $('reply').focus(); $('reply').select(); message('notice', 'Clipboard unavailable. The reply is selected; copy it using your browser.'); }
});
$('export').addEventListener('click', () => {
  if (!state || !quote) return;
  updateReport(); const url = URL.createObjectURL(new Blob([$('print-report').textContent], { type: 'text/plain;charset=utf-8' }));
  const a = elem('a'); a.href = url; a.download = 'scopeproof-report.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('notice', 'Report exported with your decisions, estimates and edited reply.');
});
$('print').addEventListener('click', () => { if (state && quote) { updateReport(); window.print(); } });
async function checkStatus() {
  try { const response = await fetch('/api/status'); if (!response.ok) throw new Error(); const data = await response.json(); $('provider-status').textContent = data.liveConfigured ? `Backboard · ${data.model} · ${data.remainingCalls} demo attempts remain this process.` : 'Live AI is not configured. The illustrative sample works without credentials.'; }
  catch { $('provider-status').textContent = 'Live AI status unavailable. You can still explore the sample.'; }
}
counters(); checkStatus();
