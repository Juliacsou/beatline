(function () {
  'use strict';
  // Uma identidade Supabase Auth por origem (o mesmo e-mail e senha em todos os jogos).
  // Nunca coloque uma chave secret/service_role no navegador.
  const config = window.BEATLINE_SUPABASE;
  const base = config.url.replace(/\/+$/, '');
  const storeKey = 'altigames.auth.' + new URL(base).hostname;
  let session = null;
  let pendingRefresh = null;

  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || 'null');
    if (saved && typeof saved.access_token === 'string' && typeof saved.refresh_token === 'string') session = saved;
  } catch (_) { /* Armazenamento pode estar bloqueado no navegador. */ }

  function clearSession() {
    session = null;
    try { localStorage.removeItem(storeKey); } catch (_) { /* Sem storage */ }
  }
  function saveSession(data) {
    if (!data?.access_token || !data?.refresh_token) throw new Error('Resposta incompleta da autenticação.');
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      email: data.user?.email || session?.email || ''
    };
    try { localStorage.setItem(storeKey, JSON.stringify(session)); } catch (_) { /* Uso sem persistência */ }
    return session;
  }
  async function callAuth(grantType, body) {
    let response;
    try {
      response = await fetch(`${base}/auth/v1/token?grant_type=${grantType}`, {
        method: 'POST',
        headers: { apikey: config.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (_) { throw new Error('Não foi possível conectar ao Supabase.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data.error_description || data.msg || data.message || data.error || '';
      if (grantType === 'password' && response.status === 400) throw new Error('E-mail ou senha incorretos.');
      throw new Error(msg || `Falha na autenticação (HTTP ${response.status}).`);
    }
    return data;
  }
  async function accessToken() {
    if (!session?.access_token) throw new Error('Sessão encerrada. Entre novamente na administração.');
    if (session.expires_at && session.expires_at > Date.now() / 1000 + 60) return session.access_token;
    if (!pendingRefresh) {
      pendingRefresh = callAuth('refresh_token', { refresh_token: session.refresh_token })
        .then(saveSession)
        .catch(err => { clearSession(); throw err; })
        .finally(() => { pendingRefresh = null; });
    }
    return (await pendingRefresh).access_token;
  }
  async function isAdministrator() {
    const token = await accessToken();
    let response;
    try {
      response = await fetch(`${base}/rest/v1/rpc/is_altigames_admin`, {
        method: 'POST',
        headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
        cache: 'no-store'
      });
    } catch (_) { throw new Error('Não foi possível verificar a autorização. Tente novamente.'); }
    if (!response.ok) {
      if (response.status === 401) { clearSession(); throw new Error('Sessão expirada. Entre novamente.'); }
      throw new Error(`Falha ao verificar permissão administrativa (HTTP ${response.status}).`);
    }
    return (await response.json()) === true;
  }
  async function restoreAdministrator() {
    if (!session) return false;
    try {
      const allowed = await isAdministrator();
      if (!allowed) clearSession();
      return allowed;
    } catch (_) { clearSession(); return false; }
  }
  async function signIn(email, password) {
    clearSession();
    saveSession(await callAuth('password', { email, password }));
    try {
      if (!await isAdministrator()) throw new Error('Esta conta não tem autorização para administrar a AltiGames.');
      return session.email || email;
    } catch (err) { clearSession(); throw err; }
  }
  async function signOut() {
    const oldToken = session?.access_token;
    clearSession();
    if (!oldToken) return;
    try {
      await fetch(`${base}/auth/v1/logout`, {
        method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${oldToken}` }
      });
    } catch (_) { /* Sessão local já foi encerrada. */ }
  }
  window.BeatlineAuth = Object.freeze({ signIn, signOut, accessToken, restoreAdministrator });
})();
