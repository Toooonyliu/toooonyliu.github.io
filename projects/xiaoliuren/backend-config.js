// Public Render service URL (no trailing slash).
// This is a public address, not a password or API key.
export const DEPLOYED_BACKEND_URL = 'https://ask-backend-s507.onrender.com';
export const BACKEND_URL = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname)
  ? 'http://127.0.0.1:5050'
  : DEPLOYED_BACKEND_URL;
