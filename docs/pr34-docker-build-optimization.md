# PR #34 — Docker build optimization: verification record

**PR:** [#34 — perf(docker): builds natifs par architecture et image runtime minimale](https://github.com/Thomasevano/musickeeper/pull/34)
**Branch:** `chore/docker-image-optimization`, base `main`
**Reviewed/verified:** 2026-07-30
**Status:** Open, `mergeStateStatus: CLEAN`, all checks green. Not yet merged.

This document records what was verified after the original PR was opened,
picking up from an earlier reviewing agent's handoff. It complements — does
not replace — the PR body itself, which still holds the local before/after
image-size measurements.

## What changed (recap)

Two independent optimizations, both in PR #34:

1. **CI build workflow** (`.github/workflows/build.yml`): one QEMU-emulated
   multi-platform job → a matrix of two **native** jobs (`linux/amd64` on
   `ubuntu-latest`, `linux/arm64` on `ubuntu-24.04-arm`) running in parallel,
   pushed by digest, recombined into one manifest by a `merge-manifest` job.
   BuildKit GHA cache added, scoped per architecture
   (`musickeeper-amd64` / `musickeeper-arm64`).
2. **Runtime image**: new `runtime-base` stage — Alpine + `libstdc++` + the
   Node binary copied from the builder stage. The final image no longer ships
   npm, Corepack, or pnpm.
3. **Dependencies**: `@inertiajs/svelte`, `@tailwindcss/vite`, `boneyard-js`,
   `mode-watcher`, `runed`, `svelte`, `tailwindcss-animate` moved to
   `devDependencies` (build/SSR-bundle-only). `jszip`, `ofetch`, and
   `openapi-types` were **removed outright** — no source import was found for
   them, they are not "reclassified" as the PR body currently states; that
   wording should be corrected before merge. `tailwind-variants` stayed a
   runtime dependency (Svelte components import it directly).

## Why CI build time couldn't be measured at PR-open time

`build.yml` only triggered on `push: tags: v*.*.*`. The PR branch never
produced a tag, so the only real number available was the release baseline:
**6 min 09 s**, one sequential job, ARM64 under QEMU
([run 30171176842](https://github.com/Thomasevano/musickeeper/actions/runs/30171176842)).

## Sequence of work done this session

1. **Merged PR #35** (`ci(preview): deploy pull requests to coolify`) into
   `main` — unrelated to #34 in scope, but its `pr-preview.yml` workflow is
   what makes the rest of this possible: it builds and deploys the real
   production Docker image, and runs Playwright, on every same-repo pull
   request.
   - Incident during merge: an earlier session had rewritten
     `docs/pr-previews.md` locally (102 → 311 lines) but never committed it.
     `gh pr merge --squash` merged the PR's remote branch state _before_ the
     rewritten doc was pushed, so `main` briefly carried the short version.
     Fixed by building a corrected commit directly on `main` with an isolated
     git index (`GIT_INDEX_FILE`, no working-tree checkout involved), so the
     fix didn't disturb an already-dirty local working tree. Verified
     `main:docs/pr-previews.md` is 311 lines after the fix
     (commit `b47b388`).
2. **Rebased PR #34 onto the updated `main`** in an isolated `git worktree`
   (kept the operation away from the already-dirty primary working tree).
   Clean rebase, no conflicts. Force-pushed.
3. This automatically triggered `pr-preview.yml` on PR #34 (`synchronize`
   event, same-repo branch). Full pipeline went green:
   - `Build preview image` (amd64 only): success,
     [run 30549238770](https://github.com/Thomasevano/musickeeper/actions/runs/30549238770).
   - `Deploy preview`: success — real Coolify deployment.
   - `End-to-end against preview`: success — full Playwright suite against
     `https://pr-34.preview.musickeeper.app`, running the optimized image.
4. **Added `workflow_dispatch` to `build.yml`** so the actual matrix build
   (both native architectures + manifest merge) can be benchmarked before
   cutting a release tag, without touching production tags. The `Docker meta`
   step disables `latest` and semver tag generation unless the trigger event
   is `push` (`enable: ${{ github.event_name == 'push' }}`); a manual run only
   ever produces a disposable `bench-<run id>` tag. Confirmed in the run logs:
   `type=raw,value=latest,enable=false`, `type=semver,...,enable=false`,
   `type=raw,value=bench-30550837348,enable=true`.
5. **Dispatched the workflow manually** on `chore/docker-image-optimization`
   — see measured results below.
6. **Updated the PR #34 description** with both result sets and the caveats
   they carry.

## Measured results

### Matrix build, both architectures (the number that matters)

[Run 30550837348](https://github.com/Thomasevano/musickeeper/actions/runs/30550837348),
`workflow_dispatch`, cold GHA cache (these cache scopes had never been
populated before this run):

| Job                           | Runner             | Duration       |
| ----------------------------- | ------------------ | -------------- |
| `build-image` (amd64)         | `ubuntu-latest`    | 2 min 58 s     |
| `build-image` (arm64)         | `ubuntu-24.04-arm` | 3 min 18 s     |
| `merge-manifest`              | `ubuntu-latest`    | 26 s           |
| **Total workflow wall-clock** |                    | **3 min 53 s** |

Against the 6 min 09 s sequential/QEMU baseline: **−2 min 16 s (−37%)**. The
two architectures run in parallel as designed (`max(amd64, arm64)` ≈ arm64's
3 min 18 s, plus the manifest merge), and native arm64 is no longer the
degraded, QEMU-emulated leg — it finished only ~20s behind amd64.

### amd64-only, before vs after (secondary data point)

`pr-preview.yml`'s build job (from #35) only builds `linux/amd64`, on a
different cache scope (`musickeeper-preview`, also cold in both runs below).
It happened to run once against the pre-#34 Dockerfile and once against the
post-#34 Dockerfile, giving a same-job, same-runner comparison:

| Run                                                                                      | Dockerfile      | Job total  | Build+push step |
| ---------------------------------------------------------------------------------------- | --------------- | ---------- | --------------- |
| [30336114896](https://github.com/Thomasevano/musickeeper/actions/runs/30336114896) (#35) | before (`main`) | 2 min 42 s | 2 min 24 s      |
| [30549238770](https://github.com/Thomasevano/musickeeper/actions/runs/30549238770) (#34) | after (this PR) | 2 min 57 s | 2 min 38 s      |

The optimized Dockerfile is **~15s slower** on amd64 alone (the extra
`runtime-base` Alpine stage adds a pull + `apk add`). This is expected and
consistent with the matrix result above: the PR's CI-time gain comes from
parallelizing and dropping QEMU on arm64, not from a faster amd64 leg. The
image-_size_ gain (documented in the PR body's local benchmark table) is
unaffected by either of these CI timing numbers.

### Manifest correctness

`imagetools inspect` against the registry wasn't reachable from this
environment (GHCR auth required, none configured locally). Verified instead
from the `merge-manifest` job logs: the `docker buildx imagetools create`
step copied blobs from **two distinct source digests**
(`sha256:f5969d50...` and `sha256:041fd759...`) into the combined
`bench-30550837348` manifest — consistent with one amd64 and one arm64
platform image being merged, not a single-arch push. A registry-side
`docker buildx imagetools inspect ghcr.io/thomasevano/musickeeper:bench-30550837348`
would give an authoritative platform list; do that once GHCR credentials are
available, ideally against the first real release tag.

## Handoff caveats: status after this session

The earlier reviewing agent (`/tmp/musickeeper-pr34-handoff.md`) listed these
as open before merge:

| Caveat                                                                                                           | Status                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate the first real tag build; confirm both matrix jobs + `merge-manifest` succeed                           | **Addressed via `workflow_dispatch`**, not yet via a real tag — recommend one more check on the actual next `v*.*.*` push, since it's a different trigger even though the job definitions are identical. |
| Inspect the published manifest for both platform entries                                                         | **Partially addressed** — confirmed via job logs (two distinct digests merged); a direct `imagetools inspect` against the registry is still outstanding (needs registry credentials).                    |
| Test important production routes/SSR pages, not only `/`, given the dependency reclassification                  | **Addressed** — the PR-#34 preview ran the full Playwright e2e suite (not a single-route smoke test) against the deployed, optimized image and passed.                                                   |
| Measure a repeated release build to confirm cache reuse vs the 6:09 baseline                                     | **Still open** — only a single cold-cache run was measured. A second `workflow_dispatch` run (with the GHA cache now warm from run 30550837348) would show the incremental-build number.                 |
| Node binary + Alpine `libstdc++` compatibility                                                                   | Already verified locally per PR body (`node -v` → `v24.18.0`); unchanged by this session.                                                                                                                |
| Review lockfile transitive version changes separately (`enhanced-resolve`, `jiti`, `lodash-es`, `tapable`, etc.) | **Still open** — not reviewed this session.                                                                                                                                                              |
| PR body wording: `jszip`/`ofetch`/`openapi-types` described as "reclassified" but are actually removed           | **Confirmed still incorrect** — `git diff` shows these three packages present nowhere in the new `package.json` (not in `devDependencies` either). Fix the PR description before merge.                  |

## Recommendation

The matrix build works as designed and delivers the claimed CI wall-clock
improvement (−37%, cold cache) while producing a correct multi-platform
manifest and a real, e2e-tested deployment. Safe to merge once:

- the PR body wording for the three removed packages is corrected, and
- (optional, not blocking) a warm-cache re-run and a real-tag validation are
  scheduled for extra confidence — neither changes the architecture, so
  neither should block merge on its own.

## References

- PR #34: https://github.com/Thomasevano/musickeeper/pull/34
- PR #35 (merged, prerequisite): https://github.com/Thomasevano/musickeeper/pull/35
- Baseline release build: https://github.com/Thomasevano/musickeeper/actions/runs/30171176842
- Matrix benchmark run: https://github.com/Thomasevano/musickeeper/actions/runs/30550837348
- amd64-only before/after: [30336114896](https://github.com/Thomasevano/musickeeper/actions/runs/30336114896), [30549238770](https://github.com/Thomasevano/musickeeper/actions/runs/30549238770)
- PR-#34 preview deployment: https://pr-34.preview.musickeeper.app
- Prior handoff: `/tmp/musickeeper-pr34-handoff.md`
  </content>
