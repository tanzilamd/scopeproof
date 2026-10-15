"""Real Chromium interaction checks. Network-mocked AI cases are explicitly labelled.
Run npm start first, then npm run test:browser. BASE_URL optionally targets deployment.
"""
import json, os, pathlib, re
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
URL = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
checks = []
def passed(name):
    checks.append(name)
    print('PASS', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, accept_downloads=True, bypass_csp=True, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    expect(page.get_by_role('heading', name='Keep the work. Protect the scope.')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(OUT / 'desktop-empty.png'), full_page=True)
    passed('desktop landing page, no horizontal overflow')

    page.locator('#sample').click()
    expect(page.locator('#review-source')).to_have_text('Illustrative sample')
    expect(page.locator('.review-row')).to_have_count(5)
    expect(page.locator('#notice')).to_contain_text('not live AI')
    expect(page.locator('#quote-total')).to_have_text('Estimate incomplete')
    expect(page.locator('#quote-detail')).to_contain_text('3 extra-work requests still need estimated hours')
    passed('clearly labelled sample and incomplete estimates')
    for i in (2, 3, 4):
        page.locator(f'#hours-{i}').fill('0')
    expect(page.locator('#quote-total')).to_have_text('$0.00')
    expect(page.locator('#reply')).to_have_value(re.compile('Proposed additional total: \\$0.00'))
    page.locator('#hours-3').fill('')
    expect(page.locator('#quote-total')).to_have_text('Estimate incomplete')
    expect(page.locator('#quote-detail')).to_contain_text('1 extra-work request still needs estimated hours')
    expect(page.locator('#reply')).to_have_value(re.compile('quote is incomplete'))
    passed('explicit zero hours completes an estimate; clearing hours restores missing-input status')
    with page.expect_download() as incomplete_event:
        page.locator('#export').click()
    incomplete_event.value.save_as(str(OUT / 'incomplete-export.txt'))
    incomplete_report = (OUT / 'incomplete-export.txt').read_text()
    assert 'Request 3: not estimated' in incomplete_report
    assert 'Total: incomplete' in incomplete_report
    assert 'Proposed additional total:' not in incomplete_report
    passed('incomplete report export identifies missing hours and never invents a final quote')
    for i, hours in [(2, '1.25'), (3, '2'), (4, '0.5')]:
        page.locator(f'#hours-{i}').fill(hours)
    page.locator('#rate').fill('19.99')
    expect(page.locator('#quote-total')).to_have_text('$74.97')
    page.locator('#decision-2').select_option('Included')
    expect(page.locator('#quote-total')).to_have_text('$49.98')
    expect(page.locator('.override-note')).to_contain_text('changed the suggestion')
    passed('human override and rounded quote arithmetic')
    page.locator('#reply').fill('My edited reply — please approve before I begin.')
    page.locator('#hours-3').fill('3')
    expect(page.locator('#reply')).to_have_value('My edited reply — please approve before I begin.')
    expect(page.locator('#reply-status')).to_contain_text('edited reply is preserved')
    with page.expect_download() as event:
        page.locator('#export').click()
    download = event.value
    download.save_as(str(OUT / 'export.txt'))
    report = (OUT / 'export.txt').read_text()
    assert 'ILLUSTRATIVE SAMPLE' in report and '(overridden)' in report and 'My edited reply' in report and '$69.97' in report
    passed('edited reply preserved; exported report matches overrides and current quote')
    page.locator('#copy').click()
    expect(page.locator('#notice')).to_contain_text(re.compile('copied|selected'))
    passed('copy action or explicit browser clipboard fallback')
    page.locator('#rate').fill('-3')
    expect(page.locator('#quote-error')).to_be_visible()
    expect(page.locator('#export')).to_be_disabled()
    page.locator('#rate').fill('50')
    passed('invalid monetary input blocks export')

    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    findings = page.evaluate('''async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v => ({id:v.id, impact:v.impact, nodes:v.nodes.map(n => n.target)}))''')
    (OUT / 'axe-desktop.json').write_text(json.dumps(findings, indent=2))
    assert not findings, findings
    passed('axe WCAG 2.1 A/AA automated scan: zero violations in populated desktop view')
    page.screenshot(path=str(OUT / 'desktop-sample.png'), full_page=True)

    page.locator('#scope').fill('Changed agreement with a new contact enquiry form.')
    expect(page.locator('#results')).to_be_hidden()
    expect(page.locator('#notice')).to_contain_text('changed')
    passed('editing source invalidates stale evidence, reply and export')

    # This is deliberately a mocked browser integration, not evidence of model quality.
    page.route('**/api/analyze', lambda route: route.fulfill(status=502, content_type='application/json', body=json.dumps({'error':'Provider unavailable in mocked browser test.'})))
    page.locator('#consent').check()
    page.locator('#analyze').click()
    expect(page.locator('#error')).to_contain_text('mocked browser test')
    page.unroute('**/api/analyze')
    passed('provider error is visible and busy state clears (mocked integration)')
    page.locator('#sample').click()
    page.locator('#consent').check()
    page.route('**/api/analyze', lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error':'Live AI is unavailable because its service authentication failed.'})))
    page.locator('#analyze').click()
    expect(page.locator('#error')).to_contain_text('authentication failed')
    expect(page.locator('#notice')).to_contain_text('still the prewritten illustrative sample, not live AI output')
    expect(page.locator('#review-source')).to_have_text('Illustrative sample')
    expect(page.locator('.review-row')).to_have_count(5)
    page.unroute('**/api/analyze')
    passed('failed live analysis explicitly preserves labelled sample, never relabels it as AI output (mocked integration)')
    injection = '<img src=x onerror="window.scopeproofXss=true">'
    payload = {'rows':[{'id':1,'request':injection,'suggested':'Needs clarification','decision':'Needs clarification','reason':injection,'quote':None,'evidence':'No supporting quote','hours':''}], 'meta':{'mode':'live','model':'MOCK ONLY','provider':'browser test','at':'test','latencyMs':1,'inputTokens':1,'outputTokens':1}}
    page.locator('#requests').fill('A deliberately mocked browser output test.')
    page.route('**/api/analyze', lambda route: route.fulfill(content_type='application/json', body=json.dumps(payload)))
    page.locator('#analyze').click()
    expect(page.locator('.request-title h4')).to_have_count(1)
    expect(page.locator('.request-title h4')).to_have_text(injection)
    assert page.locator('#review-rows img').count() == 0
    assert page.evaluate('window.scopeproofXss === undefined')
    page.unroute('**/api/analyze')
    passed('untrusted model text renders literally without HTML execution (mocked integration)')

    # Delay a mocked response and edit inputs while it is in flight.
    pending = []
    page.route('**/api/analyze', lambda route: pending.append(route))
    page.locator('#analyze').click()
    expect(page.locator('#analyze')).to_be_disabled()
    page.locator('#project').fill('Changed while waiting')
    expect(page.locator('#results')).to_be_hidden()
    assert pending
    pending[0].fulfill(content_type='application/json', body=json.dumps(payload))
    expect(page.locator('#analyze')).to_be_enabled(timeout=10000)
    expect(page.locator('#results')).to_be_hidden()
    page.unroute('**/api/analyze')
    passed('in-flight stale result discarded (mocked integration)')
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#reset').click()
    expect(page.locator('#scope')).to_have_value('')
    expect(page.locator('#results')).to_be_hidden()
    passed('reset clears agreement, review and reply')

    page.set_viewport_size({'width':390, 'height':844})
    page.goto(URL, wait_until='networkidle')
    page.locator('#sample').click()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    expect(page.locator('#decision-1')).to_be_visible()
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    findings = page.evaluate('''async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))''')
    (OUT / 'axe-mobile.json').write_text(json.dumps(findings, indent=2))
    assert not findings, findings
    page.screenshot(path=str(OUT / 'mobile-sample.png'), full_page=True)
    passed('390px mobile workflow, no overflow, zero automated WCAG A/AA violations')
    page.emulate_media(media='print')
    assert page.locator('#print-report').is_visible()
    assert 'ILLUSTRATIVE SAMPLE' in page.locator('#print-report').inner_text()
    passed('print stylesheet contains the current report')
    page.emulate_media(media='screen')
    # Test keyboard skip navigation at a fresh load.
    page.goto(URL, wait_until='networkidle')
    page.keyboard.press('Tab')
    assert page.locator('.skip-link').evaluate('(el)=>el===document.activeElement')
    page.keyboard.press('Enter')
    assert page.evaluate('location.hash') == '#workspace'
    passed('keyboard skip navigation')
    assert not errors, errors
    passed('no browser JavaScript errors')
    (OUT / 'browser-summary.json').write_text(json.dumps({'baseUrl':URL,'checks':checks,'javascriptErrors':errors},indent=2))
    browser.close()
print(f'{len(checks)} browser checks passed. AI browser responses were mocked; no paid calls were made.')
