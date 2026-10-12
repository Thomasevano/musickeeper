// Rebuild: bun src/application/use-cases/platform_metadata.prototype.build.mjs
// Build-time packaging only: the resulting HTML needs no server, framework or installation.
import { compareScenario, scenarios } from './platform_metadata.prototype.js'

const root = new URL('../../', import.meta.url)
const source = async (path) => Bun.file(new URL(path, root)).text()
const before = await source('application/use-cases/extract_link_metadata.prototype_before.ts')
const after = await source('application/use-cases/extract_link_metadata.use_case.ts')
const fetch = await source('application/use-cases/fetch_platform_metadata.use_case.ts')
const originalFetch = await source(
  'application/use-cases/fetch_platform_metadata.prototype_pr67.ts'
)
const asIs = await source('application/use-cases/extract_link_metadata.prototype_as_is.ts')
const provider = await source('infrastructure/providers/link_provider.ts')
const sources = { before, asIs, originalFetch, after, fetch, provider }
const lines = (text) => text.trimEnd().split(String.fromCharCode(10)).length
const evidence = []
for (const scenario of scenarios) {
  const comparison = await compareScenario(scenario.id)
  if (!comparison.equal) throw new Error(`Different output: ${scenario.id}`)
  evidence.push({
    scenario: scenario.label,
    equal: comparison.equal,
    calls: comparison.runs.map((run) => ({ variant: run.variant, ...run.calls })),
  })
}
console.log(JSON.stringify(evidence, null, 2))
const built = await Bun.build({
  entrypoints: [new URL('platform_metadata.prototype.ts', import.meta.url).pathname],
  target: 'browser',
  format: 'esm',
  minify: false,
})
if (!built.success) throw new Error(built.logs.join('\n'))
const logic = await built.outputs[0].text()
// Drop the bundle's export declaration; the page below calls the same module-local functions.
const inline = logic.slice(0, logic.lastIndexOf('export {'))
const data = JSON.stringify({
  sources,
  evidence,
  counts: {
    before: lines(before),
    after: lines(after),
    fetch: lines(fetch),
    providerBefore: 28,
    providerAfter: lines(provider),
  },
}).replaceAll('<', '\\u003c')
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Platform metadata integration — prototype</title>
<style>
:root{font-family:system-ui,sans-serif;color:#111827;background:#f9fafb;color-scheme:light}body{max-width:1100px;margin:auto;padding:24px}h1{font-size:28px;line-height:1.2}h2{font-size:20px}h3{font-size:16px}p{max-width:85ch;line-height:1.5}.muted{color:#4b5563}.badge{font-size:12px;font-weight:700;color:#1d4ed8}section{margin:24px 0;padding:20px;border:1px solid #d1d5db;background:white;border-radius:8px}button,input,select{font:inherit;min-height:44px;box-sizing:border-box}button,select{touch-action:manipulation}button{background:#1d4ed8;color:white;border:0;padding:10px 16px;border-radius:6px;cursor:pointer}button:disabled{background:#6b7280;cursor:default}:focus-visible{outline:3px solid #2563eb;outline-offset:3px}input[type=text]{padding:8px;border:1px solid #9ca3af;width:100%;min-width:0}label{display:block;margin:8px 0}fieldset{border:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}fieldset label{margin:0;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 8px;border:1px solid #d1d5db;border-radius:6px}fieldset input{min-height:0}pre{overflow:auto;font-size:13px;line-height:1.5;max-height:540px;background:#f3f4f6;padding:12px;border-radius:4px}summary{min-height:44px;cursor:pointer;padding:6px 0;box-sizing:border-box}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #e5e7eb;padding:10px;overflow-wrap:anywhere}.table-scroll{overflow:auto}dl{display:grid;grid-template-columns:130px 1fr;gap:6px;font-size:14px}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}.columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.run{min-width:0}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#status{font-weight:600}code{overflow-wrap:anywhere}@media(max-width:760px){body{padding:12px}section{padding:14px}.columns{grid-template-columns:1fr}h1{font-size:24px}}
</style>
<body><header><span class="badge">THROWAWAY PROTOTYPE · NOT A MERGE APPROVAL</span><h1>Does a metadata use case simplify the existing paste flow?</h1><p>Compare the current code, reuse of PR #67 unchanged, and a contextual-result version. All three keep <code>POST /api/link/metadata</code> and the existing UI response. No new HTTP endpoint is needed.</p><p class="muted">Real repository parser, extraction and enrichment code. Provider/search responses are controlled fixtures, not live requests. Fallback IDs use a fixed clock for exact comparison. Base: <code>4570788</code>; PR #67 source: <code>c8710a6</code>.</p></header>
<section><h2>1. Current result</h2><p id="status" role="status">Choose a walkthrough or compare a fixture.</p><div id="state" class="columns"></div></section>
<section><h2>2. Free play</h2><label for="scenario">Provider/search situation</label><select id="scenario"></select><label for="url">Music link (real parser; fixture data for supported links)</label><input id="url" type="text"><div class="actions"><button id="compare">Run all three versions</button><button id="reset">Reset results</button></div></section>
<section><h2>3. Guided walkthroughs</h2><fieldset id="walkthroughs"><legend>Choose a situation (resets results)</legend></fieldset><p id="description"></p><div class="actions"><button id="step1">1. Run current flow</button><button id="step2" disabled>2. Run both alternatives</button></div></section>
<section><h2>4. Code replaced — and code added</h2><p>Unchanged #67 omits parsed <code>type</code> and <code>originalUrl</code>. Its caller must still parse, then #67 parses again. The contextual variant moves parsing, fetching, error context and mapping behind one call. Enrichment and fallback stay unchanged.</p><div class="table-scroll"><table><thead><tr><th>Production source lines</th><th>Current</th><th>Contextual variant</th></tr></thead><tbody id="counts"></tbody></table></div><p class="muted">Counts include blank lines/comments. Baseline snapshots and demo code excluded. Smaller caller does not mean a smaller system.</p><div id="sources"></div></section>
<section><h2>5. What this demonstrates</h2><p><strong>Useful boundary, but not a demonstrated need for another layer.</strong> The contextual version separates platform resolution from enrichment. With only one production caller, the same work moves into another file and needs extra dependency registration. It adds no user-visible capability and saves no provider or search requests.</p><p><strong>Recommendation:</strong> keep the current flow unless separating platform resolution is itself a desired responsibility boundary or another real consumer needs it. If adopting this boundary, prefer contextual metadata over parsing twice. This is a changed interface, not PR #67 as written.</p><details><summary>Observed fixture comparison at build time</summary><pre id="evidence"></pre></details><p><strong>Limits:</strong> fixture equality is not live provider verification, full application UI verification, or approval to merge #67. Validate the real paste/display/error flow before any production cutover.</p><p><strong>Rollback:</strong> restore the original extractor and provider together; no database migration or UI contract change. Blast radius: link metadata extraction and dependency wiring. Existing enrichment/artwork/fallback policy stays in place.</p></section>
<section><h2>6. Fresh session verification — 12 October 2026</h2><ul><li>Existing extraction suite: 34 tests passed; only construction changed, no new tests.</li><li>Installed ESLint and server TypeScript check: exit 0.</li><li>Real local server with contextual wiring: missing URL, malformed URL and unsupported site returned 400; Spotify track returned 200 with Rick Astley, album, artwork, source and original URL.</li><li>Demo: all nine walkthroughs exercised in Chromium; keyboard action worked at 320 px, no horizontal page overflow; axe reported no WCAG A/AA violations.</li></ul><p>No historical CI result is used as prototype verification. No full suite, live success on the other platforms, or application UI paste flow is claimed. Those remain checks before production adoption.</p></section>
<script type="module">
${inline}
const data = ${data};
const $ = (id) => document.getElementById(id);
const labels = {before:'Current flow',pr67:'PR #67 unchanged',contextual:'Contextual result'};
let selected = scenarios[0].id;
let runs = [];
const text = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
function render() {
  $('state').replaceChildren();
  for (const run of runs) {
    const panel = text('article',''); panel.className = 'run'; panel.append(text('h3',labels[run.variant]));
    const result = run.result;
    const fields = 'error' in result ? {Error:result.error,'Original URL':result.originalUrl} : {
      Source:result.source, ID:result.musicItem.id, Title:result.musicItem.title,
      Artists:result.musicItem.artists.join(', ') || '(none)', Type:result.musicItem.itemType,
      Album:result.musicItem.albumName ?? '(none)', Artwork:result.musicItem.coverArt ?? '(none)',
      'Release date':result.musicItem.releaseDate || '(unknown)', 'Original URL':result.linkMetadata.originalUrl,
    };
    const dl = document.createElement('dl');
    for (const [key,value] of Object.entries(fields)) dl.append(text('dt',key),text('dd',String(value)));
    panel.append(dl,text('p','Calls: parse '+run.calls.parse+' · platform '+run.calls.platform+' · search '+run.calls.search));
    const details = document.createElement('details'); details.append(text('summary','Full result and call trace'),text('pre',JSON.stringify({result,trace:run.trace},null,2))); panel.append(details); $('state').append(panel);
  }
  $('status').textContent = runs.length === 0 ? 'Ready — no result yet.' : runs.length < 3 ? 'Current result observed. Run step 2 to compare.' : runs.every(run => JSON.stringify(run.result) === JSON.stringify(runs[0].result)) ? 'Same response in all three versions for this fixture.' : 'Responses differ — inspect results.';
}
function choose(id) {
  selected = id; const scenario = scenarios.find(s => s.id === id);
  $('scenario').value = id; $('url').value = scenario.url; $('description').textContent = scenario.description;
  document.querySelectorAll('input[name=walkthrough]').forEach(input => input.checked = input.value === id);
  runs = []; $('step2').disabled = true; render();
}
for (const scenario of scenarios) {
  const option = text('option',scenario.label); option.value = scenario.id; $('scenario').append(option);
  const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'radio'; input.name = 'walkthrough'; input.value = scenario.id; input.addEventListener('change',() => choose(scenario.id)); label.append(input,document.createTextNode(scenario.label)); $('walkthroughs').append(label);
}
async function busy(action) {
  const buttons = [$('compare'),$('step1'),$('step2'),$('reset')]; buttons.forEach(button => button.disabled = true);
  try { await action(); render(); } catch(error) { $('status').textContent = 'Demo failed: '+error.message; }
  finally { buttons.forEach(button => button.disabled = false); $('step2').disabled = runs.length !== 1; }
}
$('scenario').addEventListener('change',() => choose($('scenario').value));
$('reset').addEventListener('click',() => choose(selected));
$('compare').addEventListener('click',() => busy(async () => { runs = (await compareScenario(selected,$('url').value)).runs; }));
$('step1').addEventListener('click',() => busy(async () => { runs = [await runScenario(selected,'before',$('url').value)]; }));
$('step2').addEventListener('click',() => busy(async () => { for (const variant of ['pr67','contextual']) runs.push(await runScenario(selected,variant,$('url').value)); }));
const rows = [['Extractor',data.counts.before,data.counts.after],['New use case',0,data.counts.fetch],['Provider wiring',data.counts.providerBefore,data.counts.providerAfter],['Total',data.counts.before+data.counts.providerBefore,data.counts.after+data.counts.fetch+data.counts.providerAfter]];
for (const row of rows) { const tr = document.createElement('tr'); row.forEach(value => tr.append(text('td',String(value)))); $('counts').append(tr); }
for (const [name,label] of [['before','Before: current extractor'],['originalFetch','PR #67: exact use case'],['asIs','Unchanged #67 reuse: extractor (two parsers)'],['after','Contextual variant: extractor (one call)'],['fetch','Contextual variant: new use case'],['provider','Contextual variant: extra provider registration']]) { const details = document.createElement('details'); details.append(text('summary',label),text('pre',data.sources[name])); $('sources').append(details); }
$('evidence').textContent = JSON.stringify(data.evidence,null,2);
choose(selected);
</script></body></html>`
const output = new URL('../.artifacts/architecture-reviews/platform-metadata-poc.html', root)
await Bun.write(output, html)
console.log('Standalone demo:', output.pathname)
