export const DECISIONS = ['Included', 'Extra work', 'Needs clarification'];
export const LIMITS = Object.freeze({ scope: 6000, request: 500, requests: 8, project: 100 });
export class ReviewError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ReviewError('Enter an agreement and requests.');
  const { scope, requests, project = '' } = input;
  if (typeof project !== 'string' || project.length > LIMITS.project) throw new ReviewError('Project name must be at most 100 characters.');
  if (typeof scope !== 'string' || scope.trim().length < 20 || scope.length > LIMITS.scope) throw new ReviewError('Agreement must contain 20–6,000 characters.');
  if (!Array.isArray(requests) || requests.length < 1 || requests.length > LIMITS.requests || requests.some(r => typeof r !== 'string' || !r.trim() || r.length > LIMITS.request)) throw new ReviewError('Enter 1–8 requests, each at most 500 characters.');
  return { project: project.trim(), scope: scope.trim(), requests: requests.map(r => r.trim()) };
}
export function validateResult(raw, input) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { throw new ReviewError('AI returned invalid JSON. Nothing was accepted. Please review manually or try again later.', 502); }
  if (!parsed || !Array.isArray(parsed.results) || parsed.results.length !== input.requests.length) throw new ReviewError('AI returned an incomplete review. Nothing was accepted.', 502);
  const ids = new Set();
  const result = parsed.results.map(row => {
    if (!row || !Number.isInteger(row.id) || row.id < 1 || row.id > input.requests.length || ids.has(row.id) || !DECISIONS.includes(row.decision) || typeof row.reason !== 'string' || !row.reason.trim() || row.reason.length > 600 || !(row.quote === null || (typeof row.quote === 'string' && row.quote.length <= 1000))) throw new ReviewError('AI returned an invalid review structure. Nothing was accepted.', 502);
    ids.add(row.id);
    const quote = typeof row.quote === 'string' && row.quote.trim() ? row.quote : null;
    const verified = !!quote && input.scope.includes(quote);
    const rejectedEvidence = !!quote && !verified;
    const unsupported = !verified && row.decision !== 'Needs clarification';
    return { id: row.id, request: input.requests[row.id - 1], suggested: rejectedEvidence || unsupported ? 'Needs clarification' : row.decision,
      reason: rejectedEvidence || unsupported ? 'The suggestion lacked a verified supporting quote. Confirm the agreement with your client before deciding.' : row.reason.trim(),
      quote: verified ? quote : null, evidence: verified ? 'Exact quote verified' : rejectedEvidence ? 'Unverified quote removed' : 'No supporting quote',
      decision: rejectedEvidence || unsupported ? 'Needs clarification' : row.decision, hours: '' };
  });
  return result.sort((a, b) => a.id - b.id);
}
export function currencyDigits(currency) {
  if (!/^[A-Z]{3}$/.test(currency)) throw new ReviewError('Choose a valid three-letter currency.');
  const known = Intl.supportedValuesOf('currency');
  if (!known.includes(currency)) throw new ReviewError('Choose a supported currency.');
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
}
function decimal(value, digits, max, name) {
  const text = String(value);
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${digits || 1}})?$`).test(text) || (digits === 0 && text.includes('.')) || !Number.isFinite(Number(text)) || Number(text) > max) throw new ReviewError(`${name} must be between 0 and ${max}, with at most ${digits} decimal places.`);
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
}
export function calculateQuote(rows, rate, currency) {
  const digits = currencyDigits(currency);
  const minorRate = decimal(rate, digits, 100000, 'Hourly rate');
  const extras = rows.filter(r => r.decision === 'Extra work');
  let totalMinor = 0;
  const items = extras.map(row => {
    if (row.hours === '') return { id: row.id, amountMinor: null };
    const hours = decimal(row.hours, 2, 1000, 'Hours');
    const amountMinor = Math.round(minorRate * hours / 100);
    totalMinor += amountMinor;
    return { id: row.id, amountMinor };
  });
  return { currency, digits, rate: Number(rate), items, totalMinor, complete: items.every(i => i.amountMinor !== null) };
}
export function money(minor, quote) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: quote.currency }).format(minor / 10 ** quote.digits);
}
export function makeReply(input, rows, quote) {
  const lines = [`Hi,`, '', `Thanks for the new requests${input.project ? ` for ${input.project}` : ''}. Here is my proposed scope review:`];
  for (const row of rows) {
    let line = `• ${row.request} — ${row.decision}.`;
    if (row.decision === 'Extra work') {
      const item = quote.items.find(i => i.id === row.id);
      line += item.amountMinor === null ? ' Estimate to be confirmed.' : ` Proposed estimate: ${row.hours} hours at ${money(Math.round(quote.rate * 10 ** quote.digits), quote)}/hour (${money(item.amountMinor, quote)}).`;
    }
    if (row.decision === 'Needs clarification') line += ' Could we confirm the intended deliverable and limits?';
    lines.push(line);
  }
  if (quote.items.length) lines.push('', quote.complete ? `Proposed additional total: ${money(quote.totalMinor, quote)}. This is an estimate, subject to your written approval.` : 'The additional quote is incomplete; I will confirm all estimates before proposing a total.');
  lines.push('', 'Please confirm the scope, price and any timeline changes in writing before extra work begins.', '', 'Thank you!');
  return lines.join('\n');
}
export function makeReport(input, rows, quote, reply, meta) {
  const lines = ['ScopeProof — scope review', `Project: ${input.project || 'Untitled project'}`, `Source: ${meta.mode === 'sample' ? 'ILLUSTRATIVE SAMPLE — no AI call' : `Live Backboard analysis · ${meta.model}`}`, `Reviewed: ${meta.at}`, '', 'AGREEMENT', input.scope, '', 'REQUEST REVIEW'];
  for (const row of rows) lines.push('', `${row.id}. ${row.request}`, `AI/sample suggestion: ${row.suggested}`, `Your decision: ${row.decision}${row.suggested !== row.decision ? ' (overridden)' : ''}`, `Reason: ${row.reason}`, `Evidence: ${row.evidence}`, `Scope quote: ${row.quote ? `“${row.quote}”` : 'None'}`, ...(row.decision === 'Extra work' ? [`User-entered hours: ${row.hours || 'not estimated'}`] : []));
  lines.push('', 'PROPOSED CHANGE QUOTE', `Rate: ${money(Math.round(quote.rate * 10 ** quote.digits), quote)} / hour`, ...quote.items.map(i => `Request ${i.id}: ${i.amountMinor === null ? 'not estimated' : money(i.amountMinor, quote)}`), `Total: ${quote.complete ? money(quote.totalMinor, quote) : 'incomplete (enter every extra-work estimate)'}`, '', 'CLIENT REPLY (editable template)', reply, '', 'AI suggestions are not legal advice or client approval. Exact quotation matching verifies text, not interpretation. Nothing was sent to a client.');
  return lines.join('\n');
}
export const SAMPLE = Object.freeze({ project: 'Northstar studio website', scope: 'Build a five-page website with a contact enquiry form. The price includes two revision rounds. Customer accounts and online payments are excluded.', requests: ['Build the contact enquiry form.', 'Add customer login.', 'Accept online payments.', 'Make a third revision round.', 'Make the website more engaging.'] });
export function sampleRows() {
  return validateResult({ results: [
    { id: 1, decision: 'Included', reason: 'The agreed deliverables explicitly include a contact enquiry form.', quote: 'with a contact enquiry form' },
    { id: 2, decision: 'Extra work', reason: 'Customer accounts are explicitly excluded. Discuss a separate change quote.', quote: 'Customer accounts and online payments are excluded.' },
    { id: 3, decision: 'Extra work', reason: 'Online payments are explicitly excluded from this agreement.', quote: 'Customer accounts and online payments are excluded.' },
    { id: 4, decision: 'Extra work', reason: 'A third round exceeds the two revision rounds included in the price.', quote: 'The price includes two revision rounds.' },
    { id: 5, decision: 'Needs clarification', reason: '“More engaging” does not specify a deliverable or an acceptance criterion.', quote: null }
  ] }, SAMPLE);
}
