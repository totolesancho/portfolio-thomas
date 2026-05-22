// ============================================================
// /api/callback — Reçoit le code OAuth GitHub, l'échange contre
// un access_token, puis renvoie ça à la popup parent (Decap CMS)
// via le protocole postMessage avec handshake.
// ENV requis : GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
// ============================================================

export default async function handler(req, res) {
  const { code, state } = req.query || {};
  if (!code) {
    return res.status(400).send('Code OAuth manquant.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('GITHUB_CLIENT_ID ou GITHUB_CLIENT_SECRET manquant.');
  }

  // Vérification CSRF
  const cookieHeader = req.headers.cookie || '';
  const stateCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('oauth_state='));
  const savedState = stateCookie ? stateCookie.split('=')[1] : null;
  if (state && savedState && state !== savedState) {
    return res.status(400).send('OAuth state mismatch.');
  }

  // Échange code → access_token
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

  // Page HTML avec handshake postMessage attendu par Decap CMS :
  // 1. Popup envoie `authorizing:github` au parent (handshake init)
  // 2. Parent répond `authorizing:github`
  // 3. Popup envoie `authorization:github:success:{...token...}`
  // 4. Parent reçoit le token, ferme la popup, login OK
  const tokenPayload = JSON.stringify({ token, provider: 'github' });
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Auth…</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#333}</style>
</head>
<body>
<p>Authentification réussie, fermeture de la fenêtre…</p>
<p style="color:#888;font-size:13px">Si la fenêtre ne se ferme pas seule, ferme-la manuellement.</p>
<script>
(function () {
  var provider = 'github';
  var tokenContent = ${tokenPayload};

  function receiveMessage(e) {
    // Parent (Decap CMS) a renvoyé "authorizing:github" → handshake OK
    // On peut maintenant envoyer le token
    if (typeof e.data === 'string' && e.data.indexOf('authorizing:' + provider) === 0) {
      var msg = 'authorization:' + provider + ':success:' + JSON.stringify(tokenContent);
      e.source.postMessage(msg, e.origin);
      setTimeout(function () { window.close(); }, 1500);
    }
  }

  window.addEventListener('message', receiveMessage, false);

  // Étape 1 : on annonce au parent qu'on est prêt
  if (window.opener) {
    window.opener.postMessage('authorizing:' + provider, '*');
  } else {
    document.body.innerHTML += '<p style="color:red"><b>Erreur :</b> Cette page doit être ouverte depuis la popup Decap CMS (window.opener manquant). Retourne sur /admin et clique « Login with GitHub ».</p>';
  }
})();
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
