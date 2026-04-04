/**
 * SUPER PIPE — Proxy Vercel pour Replicate API
 *
 * Résout le problème CORS : le browser ne peut pas appeler Replicate directement.
 * Cette fonction serverless fait le pont côté serveur, sans restriction CORS.
 *
 * Actions supportées :
 *   create (version)  → POST /v1/predictions            { version, input }
 *   create (model)    → POST /v1/models/:owner/:name/predictions  { input }
 *   poll              → GET  /v1/predictions/:predId
 *
 * Si `version` est fourni dans le body → endpoint versionné (nano-banana-pro, etc.)
 * Si `model` est fourni sans version   → endpoint model/latest  (kling, etc.)
 */

module.exports = async function handler(req, res) {
  // ── CORS headers ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { action, apiKey, model, version, input, predId } = req.body || {};

  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  try {

    // ── Créer une prédiction ──
    if (action === 'create') {
      if (!input) return res.status(400).json({ error: 'Missing input' });

      let endpoint, body;

      if (version) {
        // Modèle versionné : POST /v1/predictions avec { version, input }
        // → utilisé par nano-banana-pro et tout modèle avec un version hash
        endpoint = 'https://api.replicate.com/v1/predictions';
        body = JSON.stringify({ version, input });
      } else if (model) {
        // Modèle sans version : POST /v1/models/{owner}/{name}/predictions
        // → utilisé par kling-v3-omni-video et les modèles "latest"
        endpoint = `https://api.replicate.com/v1/models/${model}/predictions`;
        body = JSON.stringify({ input });
      } else {
        return res.status(400).json({ error: 'Must provide model or version' });
      }

      const resp = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type':  'application/json',
          // PAS de Prefer:wait — évite le timeout Vercel (10s sur plan gratuit)
          // La réponse revient avec un predId, le browser poll ensuite
        },
        body,
      });

      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    // ── Poller une prédiction ──
    if (action === 'poll') {
      if (!predId) return res.status(400).json({ error: 'Missing predId' });

      const resp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      });
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (e) {
    console.error('Replicate proxy error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
};
