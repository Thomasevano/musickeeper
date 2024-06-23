import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchUserPlaylists } from '../../../../services/spotify_fetch_infos_service';

export const load: PageLoad = async ({ fetch }) => {

	const playlistsRes = await fetchUserPlaylists(fetch)

	if (!playlistsRes.ok) {
		throw error(playlistsRes.status, 'Failed to load playlists!');
	}

	const playlistsJSON = await playlistsRes.json();
	return {
		userPlaylists: playlistsJSON
	};
};