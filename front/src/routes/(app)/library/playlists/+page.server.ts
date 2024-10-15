import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchUserPlaylists } from '../../../../services/spotify_fetch_infos_service';
import type { spotifyTokens } from '../../../../types';

export const load: PageServerLoad = async ({ cookies }) => {
	const spotifyAccessToken = cookies.get('spotify_access_token');
	const spotifyRefreshToken = cookies.get('spotify_refresh_token');
	const spotifyAccessTokenExpiresAt = cookies.get('spotify_access_token_expires_at');

	if (!spotifyAccessToken) {
		console.error('No access token found!');
	}

	const tokens: spotifyTokens = {
		accessToken: spotifyAccessToken,
		refreshToken: spotifyRefreshToken,
		expiresAt: spotifyAccessTokenExpiresAt
	}
	console.log({ tokens })

	const playlistsRes = await fetchUserPlaylists(tokens)

	if (!playlistsRes.ok) {
		throw error(playlistsRes.status, 'Failed to load playlists!');
	}

	const playlistsJSON = await playlistsRes.json();
	return {
		userPlaylists: playlistsJSON
	};
};