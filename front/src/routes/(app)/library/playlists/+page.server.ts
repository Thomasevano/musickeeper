import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import type { providerTokens } from '../../../../types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const spotifyAccessToken = cookies.get('spotify_access_token');
	const spotifyRefreshToken = cookies.get('spotify_refresh_token');
	const spotifyAccessTokenExpiresAt = cookies.get('spotify_access_token_expires_at');
	const spotifyUserId = cookies.get('spotify_user_id');

	if (!spotifyAccessToken) {
		console.error('No access token found!');
	}
	const tokens: providerTokens = {
		accessToken: spotifyAccessToken,
		refreshToken: spotifyRefreshToken,
		expiresAt: spotifyAccessTokenExpiresAt,
		userId: spotifyUserId
	}

	const spotifyUserPlaylistsInfos = await api(fetch).getCurrentUserPlaylists(tokens)

	return {
		tokens, spotifyUserPlaylistsInfos
	};
};