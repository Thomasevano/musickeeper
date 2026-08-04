# MusicKeeper

A place to keep the music you mean to listen to. Someone hears about a track or an album, pastes a link or searches for it, and it waits in their list until they get to it.

## Language

### The list

**Listen Later List**:
The collection of music one person has saved to listen to later. It lives on their device only — there is no account and nothing is shared.
_Avoid_: library, saved items, watchlist, queue

**Listen Later Item**:
One entry in the Listen Later List: a Music Item plus when it was saved and whether it has been listened to.
_Avoid_: saved track, record, row, entry

**Music Item**:
A track or an album as identified by its metadata — title, artists, release date. What a Listen Later Item is made of, before anything about saving it.
_Avoid_: song, release, media

**Listened**:
Whether the person has heard a Listen Later Item. A state they set themselves, not something the app observes; an item stays in the list once listened.
_Avoid_: played, done, watched, completed

### Adding to the list

**Source URL**:
The link a Listen Later Item was pasted from, kept as the origin of the entry. Absent for items added from a search.
_Avoid_: original link, permalink

**External Link**:
A way to reach a Music Item on a music platform, either to stream it or to buy it. Found for an item, not entered by the person.
_Avoid_: platform link, streaming link

**Duplicate**:
A Listen Later Item that is the same recording as one being added: same title and the same set of artists.
_Avoid_: existing item, match, collision

**Another Version**:
A recording that shares a title with a Listen Later Item but not its exact set of artists — a remix, a guest version, a re-recording. Not a Duplicate, and adding it is legitimate: "Nightcall" by Kavinsky and "Nightcall" by Kavinsky, Angèle & Phoenix are two different recordings, and the difference is not always stated in the title.
_Avoid_: variant, alternate, near-duplicate
