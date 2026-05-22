// ============================================================
// /api/callback — Reçoit le code OAuth, le swap pour un token,
// puis ferme la popup en envoyant le token au parent (Decap CMS).
// ENV requis dans Vercel : GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
// ============================================================

export default async function handler(req, res) {
  const { code, state } = req.query || {};
  if (!code) {
    return res.status(400).send('Code OAuth manquant.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('GITHUB_CLIENT_ID ou GITHUB_CLIENT_SECRET env var manquante.');
  }

  // Vérification CSRF (optionnelle mais propre)
  const cookieHeader = req.headers.cookie || '';
  const stateCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('oauth_state='));
  const savedState = stateCookie ? stateCookie.split('=')[1] : null;
  if (state && savedState && state !== savedState) {
    return res.status(400).send('OAuth state mismatch.');
  }

  // Échange du code contre un access_token
  let token;
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const j = await r.json();
    token = j.access_token;
    if (!token) {
      return res
        .status(500)
        .send('Échange OAuth échoué : ' + JSON.stringify(j));
    }
  } catch (e) {
    return res.status(500).send('Erreur réseau GitHub OAuth: ' + e.message);
  }

  // Page HTML qui renvoie le token à la popup parent (Decap CMS écoute l'event message)
  const payload = JSON.stringify({ token, provider: 'github' });
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Auth…</title></head>
<body>
<p>Authentification réussie, fermeture de la fenêtre…</p>
<script>
(function () {
  function send(status, content) {
    var msg = 'authorization:github:' + status + ':' + JSON.stringify(content);
    if (window.opener) window.opener.postMessage(msg, '*');
  }
  send('success', ${payload});
  setTimeout(function () { window.close(); }, 800);
})();
</script>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
