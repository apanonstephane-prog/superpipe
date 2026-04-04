/**
 * SUPER PIPE — Google Nano Banana Pro via Replicate
 * Génération et édition d'images (Phase 1 de la pipe)
 *
 * Model : google/nano-banana-pro
 * Inputs : prompt (string), image_input (array, jusqu'à 14 images), aspect_ratio, resolution
 * Output : URL de l'image générée
 *
 * Tous les appels passent par /api/replicate (proxy Vercel) pour éviter les erreurs CORS.
 *
 * Usages :
 *   → Générer 3 tenues depuis la photo du personnage
 *   → Générer 3 lieux + 4 angles par lieu
 *   → Générer des objets (voiture, téléphone, décor)
 *   → Placer le personnage dans un lieu (composition)
 */

const NanoBananaAPI = (() => {

  // Version hash officielle — endpoint : POST /v1/predictions  { version, input }
  const VERSION = 'f5318740f60d79bf0c480216aaf9ca7614977553170eacd19ff8cbcda2409ac8';
  const PROXY   = '/api/replicate';

  function getKey() {
    return State.getConfig().replicateApiKey || '';
  }

  function isMock() {
    const key = getKey();
    return key === '' || key === 'MOCK' || key.startsWith('demo_');
  }

  /**
   * Génère une image via le proxy Vercel.
   * @param {object} opts
   * @param {string}   opts.prompt       — Description de l'image (texte libre, pas de JSON)
   * @param {string[]} opts.imageInputs  — URLs ou base64 data URIs (max 14)
   * @param {string}   opts.aspectRatio  — '1:1' | '16:9' | '9:16' | '2:3' | '3:2' etc.
   * @param {string}   opts.resolution   — '1K' | '2K' | '4K'
   */
  async function generate({ prompt, imageInputs = [], aspectRatio = '1:1', resolution = '2K' }) {
    if (isMock()) {
      const imageUrl = await _mockGenerate(prompt);
      return { predId: null, immediate: true, imageUrl };
    }

    const key = getKey();
    const input = {
      prompt,
      aspect_ratio:         aspectRatio,
      resolution,
      output_format:        'jpg',
      safety_filter_level:  'block_only_high',
    };

    if (imageInputs.length > 0) {
      input.image_input = imageInputs;
    }

    try {
      const resp = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:  'create',
          apiKey:  key,
          version: VERSION,   // endpoint versionné /v1/predictions
          input,
        }),
      });

      if (!resp.ok) {
        // 404 = proxy non déployé (test local sans Vercel dev) → mode démo
        if (resp.status === 404) {
          console.warn('NanoBanana: proxy /api/replicate introuvable — déployez sur Vercel ou lancez "vercel dev"');
          Toast.info('⚠ Proxy non disponible localement — image de démonstration utilisée');
          const imageUrl = await _mockGenerate(prompt);
          return { predId: null, immediate: true, imageUrl };
        }
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || err.error || err.title || `Nano Banana Pro: erreur ${resp.status}`);
      }

      const data = await resp.json();

      // Réponse synchrone (Prefer: wait côté serveur)
      if (data.status === 'succeeded') {
        const url = Array.isArray(data.output) ? data.output[0] : data.output;
        if (url) return { predId: data.id, immediate: true, imageUrl: url };
      }

      // Polling si nécessaire (réponse asynchrone)
      return { predId: data.id, immediate: false, imageUrl: null };

    } catch (e) {
      // Proxy inaccessible (développement local sans Vercel) → fallback démo
      if (e instanceof TypeError || e.message === 'Load failed' || e.message === 'Failed to fetch') {
        console.warn('NanoBanana: proxy inaccessible, mode démo activé :', e.message);
        Toast.info('⚠ Proxy API indisponible — image de démonstration utilisée');
        const imageUrl = await _mockGenerate(prompt);
        return { predId: null, immediate: true, imageUrl };
      }
      throw e;
    }
  }

  async function pollJob(predId) {
    if (isMock()) return { status: 'succeeded', imageUrl: null };

    const key = getKey();
    const resp = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poll', apiKey: key, predId }),
    });
    if (!resp.ok) throw new Error(`Poll error ${resp.status}`);

    const data = await resp.json();
    const url  = Array.isArray(data.output) ? data.output[0] : (data.output || null);
    return {
      status:   data.status,
      imageUrl: url,
      error:    data.error || null,
    };
  }

  /**
   * Lance la génération et attend la réponse (polling si nécessaire).
   * Rappel onProgress(0–100) à chaque étape.
   */
  async function generateAndWait(opts, onProgress) {
    onProgress?.(5);
    const result = await generate(opts);
    onProgress?.(30);

    if (result.immediate && result.imageUrl) {
      onProgress?.(100);
      return result.imageUrl;
    }

    // Polling jusqu'au résultat
    const predId = result.predId;
    let attempts = 0;
    const maxAttempts = 24; // ~2 min max (poll toutes les 5s)

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const poll = await pollJob(predId);
      onProgress?.(Math.min(95, 30 + Math.round((attempts / maxAttempts) * 60)));

      if (poll.status === 'succeeded') {
        onProgress?.(100);
        if (!poll.imageUrl) throw new Error('Nano Banana Pro : aucune image dans la réponse');
        return poll.imageUrl;
      }
      if (poll.status === 'failed' || poll.status === 'canceled') {
        throw new Error(`Nano Banana Pro ${poll.status} : ${poll.error || 'génération échouée'}`);
      }
    }

    throw new Error('Nano Banana Pro : timeout après 2 minutes');
  }

  // ── MOCK ──
  async function _mockGenerate(prompt) {
    await new Promise(r => setTimeout(r, 800));
    const seed = Math.abs((prompt || 'mock').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    return `https://picsum.photos/seed/${seed % 1000}/512/512`;
  }

  return {
    generate,
    generateAndWait,
    isMock,
  };

})();
