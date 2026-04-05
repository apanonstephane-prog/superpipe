/**
 * SUPER PIPE — Kling 3 Multishot via Replicate
 *
 * Model : kwaivgi/kling-v3-omni-video
 *
 * Mode multishot :
 *   → multi_prompt : array de {prompt, duration} — max 6 shots, 3–15s total, min 3s/shot
 *   → multi_shot_type : "customize" (obligatoire avec multi_prompt)
 *   → reference_images : jusqu'à 7 images — référencées dans les prompts via <<<image_1>>>
 *
 * Injection des références :
 *   <<<image_1>>> = personnage (tenue verrouillée)
 *   <<<image_2>>> = lieu (angle verrouillé ou image principale)
 *   <<<image_3>>>+ = objets verrouillés
 */

const KlingAPI = (() => {

  const MODEL_OWNER = 'kwaivgi';
  const MODEL_NAME  = 'kling-v3-omni-video';
  const MODEL       = `${MODEL_OWNER}/${MODEL_NAME}`;
  const PROXY       = '/api/replicate';
  // ENDPOINT conservé pour référence mais les appels passent par le proxy
  const ENDPOINT    = `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`;

  // Conservé pour compatibilité avec project.js (sélecteur de modèle)
  const MODELS = {
    kling3: {
      key:   'kling3',
      label: 'Kling 3 Multishot',
      icon:  '◈',
      desc:  'Dernière génération — multishot',
      cost:  '~$0.15/s',
    },
  };
  const MODELS_LIST = [MODELS.kling3];

  function getKey() {
    return State.getConfig().replicateApiKey || '';
  }

  function isConfigured() {
    return !!State.getConfig().replicateApiKey;
  }

  function isMock() {
    const key = getKey();
    return key === '' || key === 'MOCK' || key.startsWith('demo_');
  }

  /**
   * Construit le tableau reference_images + les tags <<<image_X>>> depuis
   * les personnages, lieux et objets verrouillés du projet.
   *
   * Retourne :
   *   referenceImages : string[]   — URLs ou base64, dans l'ordre d'injection
   *   tags.chars      : {name, tag}[]
   *   tags.locs       : {name, tag}[]
   *   tags.objs       : {name, tag}[]
   */
  function buildReferenceImages(project) {
    const lockedChars = (project?.characters || []).filter(c => c.locked);
    const lockedLocs  = (project?.locations  || []).filter(l => l.locked);
    const lockedObjs  = (project?.objects    || []).filter(o => o.locked);
    // Les titrages VFX ne sont PAS des références — ce sont des plans autonomes
    // avec leur propre logique d'animation. Ils ne s'injectent pas en <<<image_X>>>

    const referenceImages = [];
    const tags = { chars: [], locs: [], objs: [] };
    let imgIdx = 1;

    // Replicate n'accepte que des URLs HTTP — jamais du base64 (data:image/...)
    const isHttpUrl = (s) => typeof s === 'string' && s.startsWith('http');

    // Personnages — tenue verrouillée en priorité, sinon generatedBase (URL NanaBanana)
    // c.base64 = upload utilisateur (base64 brut) → JAMAIS envoyé à Replicate
    for (const c of lockedChars) {
      if (imgIdx > 7) break;
      const lockedTenue = (c.tenues || []).find(t => t.locked && t.imageUrl);
      const src = lockedTenue?.imageUrl || c.generatedBase;
      if (isHttpUrl(src)) {
        referenceImages.push(src);
        tags.chars.push({ name: c.name, tag: `<<<image_${imgIdx}>>>` });
        imgIdx++;
      }
    }

    // Lieux — angle verrouillé en priorité, sinon imageUrl (URL NanaBanana)
    // l.base64 = upload utilisateur → JAMAIS envoyé à Replicate
    for (const l of lockedLocs) {
      if (imgIdx > 7) break;
      const lockedAngle = (l.angles || []).find(a => a.locked && a.imageUrl);
      const src = lockedAngle?.imageUrl || l.imageUrl;
      if (isHttpUrl(src)) {
        referenceImages.push(src);
        tags.locs.push({ name: l.name, tag: `<<<image_${imgIdx}>>>` });
        imgIdx++;
      }
    }

    // Objets verrouillés
    for (const o of lockedObjs) {
      if (imgIdx > 7) break;
      if (o.imageUrl) {
        referenceImages.push(o.imageUrl);
        tags.objs.push({ name: o.name, tag: `<<<image_${imgIdx}>>>` });
        imgIdx++;
      }
    }

    return { referenceImages, tags };
  }

  /**
   * Génère une vidéo multishot Kling 3.
   *
   * @param {object} multishot
   *   shots[]        : [{prompt: string, duration: number}] — max 6, min 3s/shot, total 3–15s
   *   negativePrompt : string
   *   mode           : 'std' (720p) | 'pro' (1080p)
   *   aspectRatio    : '16:9' | '9:16' | '1:1'
   *
   * @param {object} project — projet courant (pour injecter les reference_images)
   */
  async function generateMultishot(multishot, project) {
    if (isMock()) return await _mockGenerate();

    const key = getKey();
    const { referenceImages } = buildReferenceImages(project);

    // ── RUSH = 10s FIXE, plusieurs shots dedans ─────────────────────────
    // Chaque rush = 10s total. Les shots sont répartis uniformément.
    // Ex: 3 shots → chacun dure ~3s (arrondi pour que la somme = 10s exactement)
    const RUSH_DURATION = 10;
    const rawShots = (multishot.shots || []).slice(0, 6);
    if (rawShots.length === 0) throw new Error('Aucun shot défini');

    // Répartir 10s uniformément entre les shots
    const shotDur = Math.floor(RUSH_DURATION / rawShots.length);
    const remainder = RUSH_DURATION - shotDur * rawShots.length;
    const shots = rawShots.map((s, i) => ({
      prompt:   (s.prompt || '').substring(0, 512),
      duration: shotDur + (i === 0 ? remainder : 0), // les secondes restantes sur le 1er
    }));

    // Vérification : la somme doit être exactement RUSH_DURATION
    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

    // mode : l'API Replicate attend "standard" ou "pro"
    const modeRaw = multishot.mode || 'standard';
    const mode    = modeRaw === 'std' ? 'standard' : modeRaw;

    const input = {
      prompt:          shots[0].prompt,
      multi_prompt:    JSON.stringify(shots),
      multi_shot_type: 'customize',
      duration:        totalDuration,
      negative_prompt: multishot.negativePrompt || rawShots[0]?.negativePrompt || 'blurry, low quality, watermark, text overlay, distorted, overexposed, amateur, static shot, shaky',
      cfg_scale:       0.5,
      mode,
      aspect_ratio:    multishot.aspectRatio || '16:9',
    };

    if (referenceImages.length > 0) {
      input.reference_images = referenceImages;
    }

    const resp = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        apiKey: key,
        model:  MODEL,
        input,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || err.error || err.title || `Kling 3 : erreur ${resp.status}`);
    }

    const data = await resp.json();

    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      if (url) return { predId: data.id, immediate: true, videoUrl: url };
    }

    return { predId: data.id, immediate: false, videoUrl: null };
  }

  /**
   * Génère un shot individuel (compatibilité ascendante avec shots.js).
   * Wrappé en multishot d'un seul plan.
   */
  async function generateVideo(shot) {
    const project   = State.currentProject();
    const multishot = {
      shots:         [{ prompt: shot.prompt, duration: Math.max(3, shot.duration || 5) }],
      negativePrompt: shot.negativePrompt,
      mode:          'std',
      aspectRatio:   '16:9',
    };
    return await generateMultishot(multishot, project);
  }

  async function pollJob(predId) {
    if (isMock()) return await _mockPoll(predId);

    const key  = getKey();
    const resp = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poll', apiKey: key, predId }),
    });
    if (!resp.ok) throw new Error(`Poll error ${resp.status}`);

    const data = await resp.json();
    return {
      status:   data.status,
      videoUrl: Array.isArray(data.output) ? data.output[0] : (data.output || null),
      progress: data.status === 'processing' ? 50 : (data.status === 'succeeded' ? 100 : 5),
      error:    data.error || null,
    };
  }

  async function generateAndWait(shot, onProgress) {
    const result = await generateVideo(shot);
    onProgress?.(10);
    if (result.immediate && result.videoUrl) { onProgress?.(100); return result.videoUrl; }
    return await _pollUntilDone(result.predId, onProgress);
  }

  async function generateMultishotAndWait(multishot, project, onProgress) {
    onProgress?.(5);
    const result = await generateMultishot(multishot, project);
    onProgress?.(10);
    if (result.immediate && result.videoUrl) { onProgress?.(100); return result.videoUrl; }
    return await _pollUntilDone(result.predId, onProgress);
  }

  async function _pollUntilDone(predId, onProgress) {
    let attempts = 0;
    const maxAttempts = 72; // ~6 min max

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const poll = await pollJob(predId);
      onProgress?.(Math.min(95, 10 + Math.round((attempts / maxAttempts) * 83)));

      if (poll.status === 'succeeded') {
        onProgress?.(100);
        if (!poll.videoUrl) throw new Error('Kling 3 : aucune URL vidéo dans la réponse');
        return poll.videoUrl;
      }
      if (poll.status === 'failed' || poll.status === 'canceled') {
        throw new Error(`Kling 3 ${poll.status} : ${poll.error || 'génération échouée'}`);
      }
    }

    throw new Error('Kling 3 : timeout après 6 minutes');
  }

  // ── MOCK ──
  async function _mockGenerate() {
    await new Promise(r => setTimeout(r, 500));
    return { predId: `mock_${Date.now()}`, immediate: false, videoUrl: null };
  }

  const _mockProgress = {};
  async function _mockPoll(predId) {
    _mockProgress[predId] = (_mockProgress[predId] || 0) + 35;
    await new Promise(r => setTimeout(r, 300));
    if (_mockProgress[predId] >= 100) {
      return { status: 'succeeded', videoUrl: 'mock://video.mp4', progress: 100 };
    }
    return { status: 'processing', videoUrl: null, progress: _mockProgress[predId] };
  }

  return {
    MODELS,
    MODELS_LIST,
    isConfigured,
    isMock,
    buildReferenceImages,
    generateVideo,
    generateMultishot,
    generateAndWait,
    generateMultishotAndWait,
    pollJob,
  };

})();
