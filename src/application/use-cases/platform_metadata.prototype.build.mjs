// Rebuild: bun src/application/use-cases/platform_metadata.prototype.build.mjs
// Build-time packaging only: the resulting HTML needs no server, framework or installation.
import { compareScenario, scenarios } from './platform_metadata.prototype.js'
import { spawnSync } from 'node:child_process'

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
const baselineProvider = spawnSync(
  'git',
  ['show', '4570788:src/infrastructure/providers/link_provider.ts'],
  { cwd: new URL('../', root).pathname, encoding: 'utf8' }
)
if (baselineProvider.status !== 0) throw new Error(baselineProvider.stderr)
const diffSpecs = [
  {
    variant: 'contextual',
    title: '1. Replace orchestration in the existing extractor',
    path: 'application/use-cases/extract_link_metadata.use_case.ts',
    old: before,
  },
  {
    variant: 'contextual',
    title: '2. Add the contextual metadata module — the work moved here',
    path: 'application/use-cases/fetch_platform_metadata.use_case.ts',
    old: '',
  },
  {
    variant: 'contextual',
    title: '3. Add dependency registration — extra wiring',
    path: 'infrastructure/providers/link_provider.ts',
    old: baselineProvider.stdout,
  },
  {
    variant: 'pr67',
    title: '1. Reuse #67 unchanged — parsing and mapping remain in the caller',
    path: 'application/use-cases/extract_link_metadata.prototype_as_is.ts',
    old: before,
  },
  {
    variant: 'pr67',
    title: '2. Add the exact #67 module — it parses again',
    path: 'application/use-cases/fetch_platform_metadata.prototype_pr67.ts',
    old: '',
  },
]
const diffs = diffSpecs.map(({ old, ...spec }) => {
  const result = spawnSync(
    'diff',
    ['-u', '-L', 'before', '-L', 'after', '-', new URL(spec.path, root).pathname],
    { input: old, encoding: 'utf8' }
  )
  if (result.status !== 0 && result.status !== 1) throw new Error(result.stderr)
  return { ...spec, patch: result.stdout }
})
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
  diffs,
  evidence,
  counts: {
    before: lines(before),
    after: lines(after),
    fetch: lines(fetch),
    providerBefore: lines(baselineProvider.stdout),
    providerAfter: lines(provider),
  },
}).replaceAll('<', '\\u003c')
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Platform metadata integration — prototype</title>
<style>
:root{font-family:system-ui,sans-serif;color:#111827;background:#f9fafb;color-scheme:light}body{max-width:1100px;margin:auto;padding:24px}h1{font-size:28px;line-height:1.2}h2{font-size:20px}h3{font-size:16px}p{max-width:85ch;line-height:1.5}.muted{color:#4b5563}.badge{font-size:12px;font-weight:700;color:#1d4ed8}section{margin:24px 0;padding:20px;border:1px solid #d1d5db;background:white;border-radius:8px}button,input,select{font:inherit;min-height:44px;box-sizing:border-box}button,select{touch-action:manipulation}button{background:#1d4ed8;color:white;border:0;padding:10px 16px;border-radius:6px;cursor:pointer}button:disabled{background:#6b7280;cursor:default}:focus-visible{outline:3px solid #2563eb;outline-offset:3px}input[type=text]{padding:8px;border:1px solid #9ca3af;width:100%;min-width:0}label{display:block;margin:8px 0}fieldset{border:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}fieldset label{margin:0;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 8px;border:1px solid #d1d5db;border-radius:6px}fieldset input{min-height:0}pre{overflow:auto;font-size:13px;line-height:1.5;max-height:540px;background:#f3f4f6;padding:12px;border-radius:4px}summary{min-height:44px;cursor:pointer;padding:6px 0;box-sizing:border-box}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #e5e7eb;padding:10px;overflow-wrap:anywhere}.table-scroll{overflow:auto}dl{display:grid;grid-template-columns:130px 1fr;gap:6px;font-size:14px}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}.columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.run{min-width:0}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#status{font-weight:600}code{overflow-wrap:anywhere}@media(max-width:760px){body{padding:12px}section{padding:14px}.columns{grid-template-columns:1fr}h1{font-size:24px}}
.diff{padding:0;max-height:none;white-space:pre;overflow:auto;border:1px solid #d1d5db;background:#fff}.diff-line{display:grid;grid-template-columns:40px 40px 18px max-content;min-width:100%;width:max-content;line-height:1.6}.line-number{color:#4b5563;text-align:right;padding-right:8px;user-select:none}.diff-line.added{background:#dcfce7;color:#14532d}.diff-line.removed{background:#fee2e2;color:#7f1d1d}.diff-line.hunk{display:block;background:#eff6ff;color:#1e3a8a;padding:4px 10px}.diff-line code{padding-right:16px;overflow-wrap:normal}.legend{display:flex;flex-wrap:wrap;gap:16px}.legend span{padding:4px 8px;border-radius:4px}.legend .removed{background:#fee2e2;color:#7f1d1d}.legend .added{background:#dcfce7;color:#14532d}.jump-links{display:flex;gap:20px;flex-wrap:wrap}.jump-links a{min-height:44px;display:inline-flex;align-items:center;color:#1d4ed8;touch-action:manipulation}.analysis-table th:first-child{width:18%}.review-note{border-left:4px solid #2563eb;padding-left:12px}h1,h2,h3{text-wrap:balance}
fieldset{min-width:0}#diffs article>p{overflow-wrap:anywhere}.analysis-table{min-width:660px}
</style>
<body><header><span class="badge">THROWAWAY PROTOTYPE · NOT A MERGE APPROVAL</span><h1>Does a metadata use case simplify the existing paste flow?</h1><p>Compare the current code, reuse of PR #67 unchanged, and a contextual-result version. All three keep <code>POST /api/link/metadata</code> and the existing UI response. No new HTTP endpoint is needed.</p><p class="muted">Real repository parser, extraction and enrichment code. Provider/search responses are controlled fixtures, not live requests. Fallback IDs use a fixed clock for exact comparison. Base: <code>4570788</code>; PR #67 source: <code>c8710a6</code>.</p></header>
<nav class="jump-links" aria-label="Comparison sections"><a href="#code-diff">Colored diff</a><a href="#analysis">Abstraction analysis</a><a href="#status">Run scenarios</a></nav>
<section id="code-diff"><h2>Colored diff: what disappears, what gets added</h2><p>Start with the extractor. Then read the new module and provider wiring: the smaller caller is only one part of the change.</p><div class="legend"><span class="removed">− Red: removed from this file</span><span class="added">+ Green: added to this file</span><span>Gray: unchanged context · numbers: old / new line</span></div><fieldset id="diff-options"><legend>Compare the existing flow with</legend><label><input type="radio" name="diff-variant" value="contextual" checked> Contextual result (one parse)</label><label><input type="radio" name="diff-variant" value="pr67"> #67 unchanged (two parses)</label></fieldset><p id="diff-note" class="review-note"></p><div id="diffs"></div><h3>Whole-system cost, not just a smaller caller</h3><div class="table-scroll"><table><thead><tr><th>Source lines</th><th>Current</th><th>Contextual variant</th></tr></thead><tbody id="counts"></tbody></table></div><p class="muted">Blank lines/comments included; demo and snapshots excluded. Line count shows relocation cost, not architectural quality.</p><details><summary>Full source snapshots (unchanged enrichment and fallback included)</summary><div id="sources"></div></details></section>
<section id="analysis">
<h2>Does the abstraction earn its extra layer?</h2>
<p><strong>Verdict: contextual metadata makes the caller cleaner, but does not make the whole system simpler today. Reusing #67 unchanged is the weaker option.</strong></p>
<div class="table-scroll" tabindex="0" role="region" aria-label="Abstraction comparison table">
<table class="analysis-table">
<thead><tr><th scope="col">Question</th><th scope="col">#67 unchanged in the existing flow</th><th scope="col">Contextual-result variant</th></tr></thead>
<tbody>
<tr><th scope="row">What does the caller still know?</th>
<td>URL parsing, parsed type, original URL, error context and metadata mapping. The wrapper does not hide those requirements.</td>
<td>One call returns metadata ready for enrichment, or an error with its original URL. Platform resolution is hidden from the caller.</td></tr>
<tr><th scope="row">Depth / leverage</th>
<td>Low here: wraps work the caller still partly repeats. The result lacks context needed by this consumer.</td>
<td>Better: parsing, platform fetching, error context and mapping share one interface. Only one production consumer benefits so far.</td></tr>
<tr><th scope="row">Locality</th>
<td>Parsing appears in two modules. Changes to parse-related assumptions require checking both.</td>
<td>Resolution changes live in the new module; enrichment/artwork/fallback policy stays in the extractor. Following the full happy path requires one extra file.</td></tr>
<tr><th scope="row">Runtime work</th>
<td>Supported-link fixtures: two parses, one platform call. No search/request savings.</td>
<td>Same parse, provider and search counts as the baseline. Cleaner ownership, not a performance improvement.</td></tr>
<tr><th scope="row">Testing seam</th>
<td>Existing dependency ports already permit parser/provider substitution. Another class is not needed just to make this testable.</td>
<td>Can exercise contextual resolution separately. Existing extraction contract still needs coverage; no new permanent tests added in this prototype.</td></tr>
<tr><th scope="row">Maintenance / review</th>
<td>Extra module, constructor dependency and registration without removing caller knowledge.</td>
<td>Smaller extractor, but another module, registration and interface to understand. Same behavior spread over more files.</td></tr>
<tr><th scope="row">Deletion test</th>
<td>Deleting the wrapper removes duplicate parsing in this integration; provider calls can stay directly in the extractor.</td>
<td>Deleting the module moves its implementation back into one caller. No demonstrated duplication across multiple production consumers is eliminated.</td></tr>
</tbody></table></div>
<h3>Decision for this project</h3>
<p>Keep the existing flow for now. The adapters already hide provider-specific complexity, and the current extractor already composes them with enrichment. A separate contextual module is reasonable if platform resolution should be an independently owned responsibility or another real consumer needs it; neither is a demonstrated requirement here.</p>
<p>If choosing that separation, use the contextual interface and preserve the existing HTTP/UI contract. It is <strong>not #67 as written</strong>: its result changes, and adoption would need its callers/tests migrated. This POC does not justify shipping the unused new endpoint.</p>
<p><strong>Rollback:</strong> restore extractor and provider together. No storage migration or UI contract change. <strong>Blast radius:</strong> existing link metadata extraction and dependency wiring.</p>
<details><summary>Observed fixture comparison at build time</summary><pre id="evidence"></pre></details>
</section>
<section><h2>1. Current result</h2><p id="status" role="status">Choose a walkthrough or compare a fixture.</p><div id="state" class="columns"></div></section>
<section><h2>2. Free play</h2><label for="scenario">Provider/search situation</label><select id="scenario"></select><label for="url">Music link (real parser; fixture data for supported links)</label><input id="url" type="text"><div class="actions"><button id="compare">Run all three versions</button><button id="reset">Reset results</button></div></section>
<section><h2>3. Guided walkthroughs</h2><fieldset id="walkthroughs"><legend>Choose a situation (resets results)</legend></fieldset><p id="description"></p><div class="actions"><button id="step1">1. Run current flow</button><button id="step2" disabled>2. Run both alternatives</button></div></section>
<section><h2>Verification — scope and timing</h2><h3>Earlier POC run — 12 October 2026</h3><ul><li>34 existing extraction tests passed; only construction changed, no new tests.</li><li>Installed ESLint and server TypeScript check exited 0.</li><li>Real local server: missing, malformed and unsupported URLs returned 400; Spotify returned 200 with Rick Astley, album, artwork, source and original URL.</li><li>Nine demo walkthroughs exercised in Chromium.</li></ul><h3>Colored-diff update — same session</h3><p>Builder re-executes all nine fixture comparisons. Native unified diffs come from the captured source, not hand-written excerpts. Earlier backend test and HTTP evidence was not rerun for this display-only change.</p><p><strong>Remaining checks:</strong> no full suite, live success on other platforms, or actual application UI paste/display/error flow is claimed. Those remain checks before production adoption. No historical CI is treated as fresh prototype verification.</p></section>
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
function renderDiffs(variant) {
  $('diffs').replaceChildren();
  $('diff-note').textContent = variant === 'contextual' ? 'These are the actual prototype application changes: smaller extractor, new contextual module, extra provider registration. Enrichment and fallback are unchanged.' : 'This is the runnable alternative used by the demo, not the application provider wiring. #67 itself is unchanged. Both the caller and #67 parse supported URLs; registration would also be needed to adopt this alternative.';
  for (const diff of data.diffs.filter(entry => entry.variant === variant)) {
    const block = document.createElement('article'); block.append(text('h3',diff.title),text('p','src/'+diff.path));
    const pre = document.createElement('pre'); pre.className = 'diff'; pre.tabIndex = 0; pre.setAttribute('role','region'); pre.setAttribute('aria-label',diff.title+' code diff');
    let oldLine = 0, newLine = 0;
    for (const line of diff.patch.trimEnd().split(String.fromCharCode(10))) {
      if (line.startsWith('---') || line.startsWith('+++')) continue;
      const row = document.createElement('span'); row.className = 'diff-line';
      if (line.startsWith('@@')) {
        const ranges = line.split(' '); oldLine = Number(ranges[1].slice(1).split(',')[0]); newLine = Number(ranges[2].slice(1).split(',')[0]);
        row.classList.add('hunk'); row.textContent = line; pre.append(row); continue;
      }
      const marker = line[0]; if (!['+','-',' '].includes(marker)) continue;
      if (marker === '+') row.classList.add('added'); if (marker === '-') row.classList.add('removed');
      const oldNumber = text('span',marker === '+' ? '' : String(oldLine++)); oldNumber.className = 'line-number';
      const newNumber = text('span',marker === '-' ? '' : String(newLine++)); newNumber.className = 'line-number';
      row.append(oldNumber,newNumber,text('span',marker),text('code',line.slice(1))); pre.append(row);
    }
    block.append(pre); $('diffs').append(block);
  }
}
document.querySelectorAll('input[name=diff-variant]').forEach(input => input.addEventListener('change',() => renderDiffs(input.value)));
renderDiffs('contextual');
$('evidence').textContent = JSON.stringify(data.evidence,null,2);
choose(selected);
</script></body></html>`
const output = new URL('../.artifacts/architecture-reviews/platform-metadata-poc.html', root)
await Bun.write(output, html)
console.log('Standalone demo:', output.pathname)
