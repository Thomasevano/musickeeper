# MusicKeeper

> [!NOTE]
> THIS PROJECT IS STILL IN DEVELOPMENT

MusicKeeper lets you keep the music you find outside your streaming platform. Paste a link to a track, album, or playlist and it resolves the same item across platforms via MusicBrainz, so you can save it to a listen-later list without losing it when a friend shares a Spotify link but you use Apple Music.

**Live demo:** [musickeeper.app](https://musickeeper.app)

**Stack:** Svelte + Inertia on AdonisJS (hexagonal architecture — domain/application/infrastructure layers), TypeScript, unit + functional + E2E tests (Playwright), self-hosted via Docker.

## Use it on your own

Generate an app key with AdonisJS

```bash
node ace generate:key
```

### SelfHost MusicKeeper using Docker

you can use the docker-compose.yml file or this one

```yaml
services:
  musickeeper:
    build: ghcr.io/thomasevano/musickeeper:latest
    container_name: musickeeper
    ports:
      - '8080:8080'
    environment:
      - PORT=8080
      - APP_KEY=
      - SESSION_DRIVER=memory
      - VITE_APP_NAME=MusicKeeper
      - MB_APP_CONTACT_EMAIL= # contact email for MusicBrainz
```

### Use Locally

```bash
git clone https://github.com/thomasevano/musickeeper.git
cd musickeeper
pnpm install
cp .env.example .env
```

Edit the `.env` file with the Spotify credentials of the app you created on the Spotify developer dashboard ([you can find documentation to create one here](https://github.com/thomasevano/musickeeper/wiki/How-to-create-a-Spotify-app))

Then run the dev server

```bash
pnpm dev
```

You can now access the app on <http://127.0.0.1:3333>

To build and run a production bundle instead, use `pnpm build` then `pnpm start`.

### Frontend updates

An open tab shows a nonblocking update banner when it detects a different frontend build, encouraging a reload to help avoid issues with an outdated version. Reloading is explicit: unfinished input requires confirmation, and pending Listen Later writes must finish before navigation. While the new page loads, a modal blocks further edits and list actions. Cancel reload stops navigation before editing is enabled again and retains unfinished input. A failed write or an offline reload keeps the current page open. Saved items remain in IndexedDB; unfinished input is not restored after reloading.

The build identity comes from Inertia's Vite manifest fingerprint, not the package version. Existing application requests expose `X-App-Version`; returning to a visible tab or reconnecting checks the uncached `GET /app-version` endpoint. There is no polling, so an idle tab does not receive an immediate deployment notification. Failed checks do not imply that the tab is up to date.

Deploy the server, manifest and hashed assets together. With multiple instances, switch traffic consistently and retain assets needed by older tabs; do not advertise a build before its assets are available. Explicit update navigation bypasses the service worker's cached-page fallback. Detection also works without a service worker and when the worker script has not changed.

Only tabs that loaded this notification feature can participate. This does not guarantee compatibility between old clients and new APIs, coordinate IndexedDB schema upgrades, or synchronize saved data across tabs.

## Usage measurement

MusicKeeper uses Plausible to estimate daily active visitors from successful Listen Later
saves, removals, listened-status changes, and External Link openings from the list.
Reading alone, cancelled actions, rejected duplicates, and failed actions do not count.
An External Link opening is not proof of playback.

Only the action category is sent as a custom property—not music metadata, searches,
music URLs, or visitor identifiers. No accounts or persistent visitor IDs are introduced.
The estimate cannot establish exact people counts, cross-device identity, or retention.
Offline use, blockers, and network failures can undercount activity.

Tracking is limited to the production site; development, previews, and browser automation
are excluded. To opt out in a browser/profile, open MusicKeeper's browser console and run:

```js
localStorage.setItem('plausible_ignore', 'true')
location.reload()
```

This preference suppresses both pageviews and activity tracking. Apply it separately in
each browser/profile/device; clearing site storage removes it. If the preference cannot
be read, tracking stays disabled. Events may wait in memory while the tracker loads,
but there is no persistent replay queue or blocker bypass. Analytics failure must not
change the outcome of a library action.

Analytics browser tests proxy the production origin to a test server and replace the
collector. Teardown blocks new requests and drains in-flight proxy handlers before
closing each page; real proxy fetch failures still fail the run.

## FAQ

### What ?

MusicKeeper is a music manager app that help you manage, extract your music between different streaming platforms and why not in the future, legally and easily buy the music you loves to finally own back your music

### Why ?

- You got music recommandations by friends, online communities, etc but you lost them.
- You want to take back control on your music, own the files and why not exit from music providers

### Features

#### Since v0.2.0

- [x] Listen later list
  - [x] Tracks
  - [x] Albums
  - [ ] Artists
  - [ ] Playlists
- [x] Search
- [x] Local first
- [x] Offline Support
- [x] PWA
- [ ] Sort Listen later list
- [ ] Sync List with multiple devices
- [ ] Share list

#### v0.1.0

- [x] Extract your playlists as text files (available in [this version](https://github.com/Thomasevano/musickeeper/tree/v0.1.0) only)

## 📝 License

Copyright © 2025 [Thomas Evano](https://github.com/thomasevano).
