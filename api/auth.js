// ============================================================
// /api/auth — Démarre le flow OAuth GitHub pour Decap CMS
// Redirige l'utilisateur vers GitHub pour s'authentifier.
// ENV requis dans Vercel : GITHUB_CLIENT_ID
// ============================================================

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res
      .status(500)
      .send('GITHUB_CLIENT_ID env var manquante — configurer dans Vercel → Settings → Environment Variables.');
  }

  // URL de callback (cette même API, route /callback)
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;

  const scope = 'repo,user';
  const state = Math.random().toString(36).slice(2);

  const authUrl =
    'https://github.com/login/oauth/authorize?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }).toString();

  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  res.end();
}
