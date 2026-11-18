# Roll back the app, not the Listen Later library

Do not redeploy the unmodified previous release if any browser has opened library v4. That release requests v3 and cannot open a v4 database. The rollback build uses the previous release's UI and server with a small compatibility patch: it opens v4, preserves existing rows and their keys, and writes new rows with separate local IDs and optional MusicBrainz IDs. Paste uses the previous release's automatic matching; a link without a match still saves without a MusicBrainz ID.

## Build and deploy

From a checkout containing this guide, with the previous release commit `7d7ddee0d05ddaf99a2adfc6e377434d21d60fbd` available locally:

```sh
scratch=$(mktemp -d)
bash scripts/prepare-library-rollback.sh "$scratch/rollback"
docker build --tag musickeeper:library-v4-rollback "$scratch/rollback"
```

Deploy `musickeeper:library-v4-rollback` in place of the current image with the same runtime configuration and public origin (scheme, hostname and port). Keep the existing app key, session configuration and MusicBrainz contact email. For a local Docker run with Service Workers enabled:

```sh
docker run --rm -p 127.0.0.1:63136:8080 \
  -e HOST=0.0.0.0 -e PORT=8080 -e LOG_LEVEL=info \
  -e SESSION_DRIVER=memory -e APP_KEY=applicationtestappkey \
  -e MB_APP_CONTACT_EMAIL \
  musickeeper:library-v4-rollback
```

Set `MB_APP_CONTACT_EMAIL` to your real contact email for live MusicBrainz calls. Open or reload the app after deploying. Close any older MusicKeeper tabs or installed app windows that still hold a v3 connection. Do not clear site data or change origins: either can make the existing browser library unavailable. A later forward deployment uses the same v4 library without a conversion step.

## Automated browser regression

Use Node 24.18.0 and the `pnpm` version pinned in `package.json`. Build both apps with their frozen lockfiles:

```sh
pnpm install --frozen-lockfile
pnpm build
(cd "$scratch/rollback" && pnpm install --frozen-lockfile && pnpm build)
```

Start each production build in a separate terminal. In the checkout root, run:

```sh
(cd build && env NODE_ENV=production HOST=127.0.0.1 PORT=63136 \
  APP_KEY=applicationtestappkey SESSION_DRIVER=memory LOG_LEVEL=info \
  MB_APP_CONTACT_EMAIL=test@example.com node bin/server.js)
```

Run the same command from `"$scratch/rollback"` with `PORT=63137`. Then run from the checkout root:

```sh
pnpm exec playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:63136 PLAYWRIGHT_ROLLBACK_URL=http://127.0.0.1:63137 \
  pnpm exec playwright test tests/e2e/library_rollback.spec.ts --trace on
```

The test upgrades a real Chromium IndexedDB from v3 to v4, switches to rollback and back on the same origin, and verifies that search, matched paste, and unmatched paste writes survive. Catalog responses are deterministic and Service Workers are blocked. Replay the trace in `test-results/` with `pnpm exec playwright show-trace <trace.zip>`.

The PR preview workflow runs the same check against two local production builds before testing the deployed preview.

## Browser evidence with Service Workers enabled

Use one disposable browser profile and `http://127.0.0.1:63136` throughout. As a **local fixture only**, build the unpatched base from `git archive 7d7ddee0d05ddaf99a2adfc6e377434d21d60fbd` in a separate scratch directory. Start each production server in turn on port `63136` with a real `MB_APP_CONTACT_EMAIL`. At each switch, wait for `/app-version` and reload (use the app's update action if offered). Never clear site data.

1. **Previous release fixture:** Add a recording from search on `/library/listen-later`. Capture the saved row and `listenLaterDB` v3 in DevTools → Application → IndexedDB.
2. **Forward:** Verify the old row remains. Paste a different recording, choose **Find MusicBrainz matches**, select a candidate, **Apply corrections**, then **Add to List**. Capture the v4 database and the new row's distinct `id` and `musicBrainzId`.
3. **Rollback:** Verify both rows are still present and show as selected in search. Paste a third recording and let the previous UI match it automatically. Save, reload, search for it and capture the selected result and its distinct `id` and `musicBrainzId`.
4. **Forward again:** Capture all three rows, the selected rollback-created search result, and the unchanged v4 keys.
