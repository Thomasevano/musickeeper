import type { LayoutServerLoad } from './$types';
// import { redirect } from '@sveltejs/kit';
// import { PUBLIC_SPOTIFY_BASE_URL } from '$env/static/private';

// export const load: LayoutServerLoad = async ({ cookies, fetch, url }) => {
// 	const accessToken = cookies.get('spotify_access_token');
// 	const refreshToken = cookies.get('spotify_refresh_token');
// 	if (!accessToken) {
// 		return {
// 			user: null
// 		};
// 	}

// 	const profileRes = await fetch(`${PUBLIC_SPOTIFY_BASE_URL}/me`, {
// 		headers: {
// 			Authorization: `Bearer ${accessToken}`
// 		}
// 	});
// 	if (profileRes.ok) {
// 		const profile = await profileRes.json();
// 		return {
// 			user: profile
// 		};
// 	}
// 	if (profileRes.status === 401 && refreshToken) {
// 		// refresh the token and try again
// 		const refreshRes = await fetch('/api/auth/refresh');
// 		if (refreshRes.ok) {
// 			throw redirect(307, url.pathname);
// 		}
// 		return {
// 			user: null
// 		};
// 	} else {
// 		return {
// 			user: null
// 		};
// 	}
// };

export type OutputType = { user: object; isLoggedIn: boolean };
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (user) {
		// Return the output object
		return { user, isLoggedIn: true };
	}
	// Return the output object
	return {
		user: undefined,
		isLoggedIn: false
	};
};
