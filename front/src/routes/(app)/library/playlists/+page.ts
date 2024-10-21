import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, tokens } = await parent()

	await queryClient.prefetchQuery({
		queryKey: ['paginatedPlaylistsInfos'],
		queryFn: () => api(fetch).getUserPlaylists(tokens.spotifyTokens)
	})
};