## Project guardrails

- **Generated changelog:** `CHANGELOG.md` belongs exclusively to the autorelease (`release-please`) workflow. Agents must not hand-edit it or add release notes; use Conventional Commit/PR metadata as release input. Reviewers must flag hand-authored changelog changes.
- **Public documentation:** document analytics usage, privacy and limitations without publishing private infrastructure hostnames, dashboard/admin links or internal operational runbooks. The maintainer's self-hosted Plausible instance is private; a browser-visible collector endpoint is not permission to advertise it.

## Code Review Rules

Read root `REVIEW.md` for MusicKeeper's review priorities, including security boundaries.
