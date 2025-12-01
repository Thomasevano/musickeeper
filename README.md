# MusicKeeper

⚠️ THIS PROJECT IS STILL IN DEVELOPMENT ⚠️

##  Use Locally

```bash
git clone https://github.com/thomasevano/musickeeper.git
cd musickeeper
npm install
cp .env.example .env
```

Generate an app key with AdonisJS

```bash
node ace generate:key
```

Edit the `.env` file with the Spotify credentials of the app you created on the Spotify developer dashboard([you can find documentation to create one here](https://github.com/thomasevano/musickeeper/wiki/How-to-create-a-Spotify-app))

Then run the app

```bash
npm run dev
```

You can now access the app on <http://127.0.0.1:3333>

## FAQ

### What ?

MusicKeeper is a music manager app that help you manage, extract, transfer your music between different streaming platforms and why not legally and easily buy the music you loves to finally own back your music

### Why ?

- You want to switch from a music provider to another (for example: Spotify to Apple Music )
- You want to save your favorite music in the most compatible format it exist (text file, maybe more types would be available later)
- You are subscribed to many music provider and it's tedious to keep them synchronized with your music
- You want to take back control on your music, own the files and why not exit from music providers

### Features

- [x] Connect your Spotify account
- [x] Extract your playlists as text files (available in v0.1.0)
- [ ] Extract Albums, liked songs as text files
- [ ] Buy an album directly from the app
- [ ] Buy a playlist directly from the app
- [ ] Transfer from one streaming service to another
- [ ] Import your music library to to musickeeper
- [ ] Sync between streaming service and musickeeper
- Streaming service:
  - [x] Spotify
  - [ ] Apple Music
  - [ ] Youtube Music
  - [ ] Deezer
  - [ ] Tidal
  - [ ] Soundcloud
  - [ ] Amazon Music

## 📝 License

Copyright © 2025 [Thomas Evano](https://github.com/thomasevano).
