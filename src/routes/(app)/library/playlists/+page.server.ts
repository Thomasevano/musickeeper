import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchUserPlaylists } from '../../../../services/spotify_fetch_infos_service';

export const load: PageServerLoad = async ({ cookies }) => {
	const spotifyAccessToken = cookies.get('spotify_access_token');

	const playlistsRes = await fetchUserPlaylists(spotifyAccessToken)

	if (!playlistsRes.ok) {
		throw error(playlistsRes.status, 'Failed to load playlists!');
	}

	const playlistsJSON = await playlistsRes.json();
	return {
		userPlaylists: playlistsJSON
	};
};