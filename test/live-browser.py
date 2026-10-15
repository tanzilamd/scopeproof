"""One real, paid browser→application→Backboard request. No route mocks.
Start a configured server and set RUN_PAID_BROWSER_TEST=1 explicitly.
"""
import datetime, json, os, pathlib
from playwright.sync_api import sync_playwright, expect

if os.environ.get('RUN_PAID_BROWSER_TEST') != '1':
    raise SystemExit('This makes one paid AI call. Set RUN_PAID_BROWSER_TEST=1 after checking model-token credit and the server configuration.')
base = os.environ.get('BASE_URL', 'http://127.0.0.1:3001')
public = base.rstrip('/') == 'https://scopeproof.onrender.com'
name = 'production-live-browser' if public else 'local-live-browser'
root = pathlib.Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1100}, reduced_motion='reduce')
    page.goto(base, wait_until='networkidle', timeout=60000)
    page.locator('#sample').click()
    page.locator('#consent').check()
    with page.expect_response(lambda r:r.url.endswith('/api/analyze'), timeout=70000) as response:
        page.locator('#analyze').click()
    r = response.value
    data = r.json()
    assert r.status == 200, (r.status, data.get('error'))
    expect(page.locator('#review-source')).to_have_text('Live AI')
    expect(page.locator('.review-row')).to_have_count(5)
    expected = ['Included','Extra work','Extra work','Extra work','Needs clarification']
    assert [row['decision'] for row in data['rows']] == expected
    assert data['meta']['model'] == 'qwen/qwen3-32b'
    for row in data['rows']:
        if row['quote']:
            assert row['quote'] in page.locator('#scope').input_value()
    page.screenshot(path=str(root/'docs/screenshots'/f'{name}.png'), full_page=True)
    evidence = {'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':base,'networkMocked':False,'httpStatus':r.status,'input':{'scope':page.locator('#scope').input_value(),'requests':page.locator('#requests').input_value().splitlines()},'result':data}
    (root/'docs/evidence'/f'{name}.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(f'Real browser → {base} → Backboard → selected Qwen3-32B: HTTP 200, 5/5 expected decisions and matching evidence quotes; {data["meta"]["latencyMs"]}ms. No mocks.')
    browser.close()
