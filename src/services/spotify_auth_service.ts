import axios from "axios";

export const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const params = new URLSearchParams(window.location.search);
export const code = params.get("code");
const redirectUri = "http://localhost:5173/";
const scope = `user-read-private user-read-email playlist-read-private playlist-read-collaborative 
playlist-modify-private playlist-modify-public user-library-modify user-library-read`;

export async function redirectToAuthCodeFlow() {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", redirectUri);
  params.append("scope", scope);
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
}


export const getAccessToken = async (code:string) => {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("code_verifier", verifier!);

  const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
  });

  const response = await result.json();
  console.log("response access: ")
  console.log(response)
  localStorage.setItem('spotify_access_token', response.access_token);
  localStorage.setItem('spotify_refresh_token', response.refresh_token);
  return response
}

export const getRefreshToken = async () => {
  // refresh token that has been previously stored
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  const url = "https://accounts.spotify.com/api/token";
  
  const body = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  }
  
  const headers = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
  }
  const result = await axios.post(url, new URLSearchParams(body), headers);
  const response = await result.data;
  console.log("response refresh: ")
  console.log(response)

  localStorage.setItem('spotify_access_token', response.access_token);
  localStorage.setItem('spotify_refresh_token', response.refresh_token);
  return response
}
