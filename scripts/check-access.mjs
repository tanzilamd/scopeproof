// Safe diagnostics: reports presence and HTTP status, never credential values.
const endpoints = [
  ['BACKBOARD_API_KEY', 'https://app.backboard.io/api/billing/balance', 'X-API-Key', ''],
  ['RENDER_API_KEY', 'https://api.render.com/v1/services?limit=1', 'Authorization', 'Bearer '],
  ['DEVTO_API_KEY', 'https://dev.to/api/users/me', 'api-key', '']
];
for (const [name, url, header, prefix] of endpoints) {
  if (!process.env[name]) { console.log(`${name}: missing`); process.exitCode = 1; continue; }
  try {
    const r = await fetch(url, { headers: { [header]: prefix + process.env[name], 'User-Agent':'ScopeProof/1.0' }, signal: AbortSignal.timeout(20000) });
    console.log(`${name}: present; required read-only API HTTP ${r.status}`);
    if (!r.ok) process.exitCode = 1;
  } catch { console.log(`${name}: present; connection failed`); process.exitCode = 1; }
}
