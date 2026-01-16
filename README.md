# MusicKeeper

⚠️ THIS PROJECT IS STILL IN DEVELOPMENT ⚠️

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
      - VITE_BASE_URL= # URL with port of your musickeeper instance
      - VITE_APP_NAME=MusicKeeper
      - MB_APP_CONTACT_EMAIL= # contact email for MusicBrainz
```

###  Use Locally

```bash
git clone https://github.com/thomasevano/musickeeper.git
cd musickeeper
pnpm install
cp .env.example .env
```

Edit the `.env` file with the Spotify credentials of the app you created on the Spotify developer dashboard([you can find documentation to create one here](https://github.com/thomasevano/musickeeper/wiki/How-to-create-a-Spotify-app))

Then run the app

```bash
pnpm build
```

You can now access the app on <http://127.0.0.1:3333>

## FAQ

### What ?

MusicKeeper is a music manager app that help you manage, extract your music between different streaming platforms and why not in the future, legally and easily buy the music you loves to finally own back your music

### Why ?

- You got music recommandations by friends, online communities, etc but you lost them.
- You want to take back control on your music, own the files and why not exit from music providers

### Features

- [x] Connect your Spotify account
- [x] Extract your playlists as text files (available in [v0.1.0](https://github.com/Thomasevano/musickeeper/tree/v0.1.0) only)
- [x] Listen later list (available in v0.2.0 >=)
  - [x] Tracks
  - [x] Albums
  - [ ] Artists
  - [ ] Playlists
- [ ] Sort Listen later list
- [ ] Do not depend on Spotify API

## 📝 License

Copyright © 2025 [Thomas Evano](https://github.com/thomasevano).
