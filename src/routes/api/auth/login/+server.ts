import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SPOTIFY_CLIENT_ID } from '$env/static/private'

function generateCodeVerifier(length: number) {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

async function generateCodeChallenge(codeVerifier: string) {
	const data = new TextEncoder().encode(codeVerifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

const verifier = generateCodeVerifier(128);
const challenge = await generateCodeChallenge(verifier);

const scope = `user-read-private user-read-email playlist-read-private playlist-read-collaborative 
playlist-modify-private playlist-modify-public user-library-modify user-library-read`

export const GET: RequestHandler = ({ cookies }) => {
	cookies.set('spotify_auth_state', verifier, { path: '/' });
	cookies.set('spotify_auth_challenge_verifier', challenge, { path: '/' });
	throw redirect(
		307,
		`https://accounts.spotify.com/authorize?${new URLSearchParams({
			client_id: SPOTIFY_CLIENT_ID,
			response_type: 'code',
			redirect_uri: `${import.meta.env.VITE_BASE_URL}/api/auth/callback`,
			state: verifier,
			scope,
			code_challenge_method: 'S256',
			code_challenge: challenge
		})}`
	);
};
