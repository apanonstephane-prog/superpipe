/**
 * SUPER PIPE — Shotstack API
 * Montage automatique des shots validés
 * Doc: https://shotstack.io/docs/api/
 */

const ShotstackAPI = (() => {

  function getConfig() {
    const cfg = State.getConfig();
    return {
      apiKey: cfg.shotstackApiKey,
      env: cfg.shotstackEnv || 'stage',
    };
  }

  function isConfigured() {
    return !!State.getConfig().shotstackApiKey;
  }

  function getBaseUrl(env) {
    return env === 'production'
      ? 'https://api.shotstack.io/v1'
      : 'https://api.shotstack.io/stage';
  }

  /**
   * Construit la timeline Shotstack depuis les shots validés.
   * Applique les règles du Document Fondation.
   */
  function buildTimeline(project) {
    // Les rushes validés (renommés de project.shots → project.rushes)
    const shots = (project.rushes || []).filter(s => s.validated && s.videoUrl);
    const playbook = PromptEngine.getPlaybook(project.genre) || {};
    const trackClips = [];
    let currentTime = 0;

    shots.forEach((shot, i) => {
      // Durée totale du rush = somme des plans internes
      const duration = shot.shots
        ? shot.shots.reduce((a, s) => a + (s.duration || 5), 0)
        : (shot.duration || 3);

      // Transition basée sur le genre
      let transition = null;
      if (project.genre === 'trap') transition = { in: 'flash', out: 'flash' };
      else if (project.genre === 'reggae' || project.genre === 'zouk') transition = { in: 'fade', out: 'fade' };
      else if (project.genre === 'afro') transition = { in: 'wipeLeft', out: 'wipeRight' };
      else transition = { in: 'cut', out: 'cut' };

      trackClips.push({
        asset: { type: 'video', src: shot.videoUrl, trim: 0 },
        start: currentTime,
        length: duration,
        transition,
        effect: shot.sectionType === 'chorus' ? 'zoomIn' : undefined,
      });

      currentTime += duration;
    });

    // Bande-son : URL manuelle > base64 de la piste uploadée
    let soundtrack;
    if (project.soundtrackUrl) {
      soundtrack = { src: project.soundtrackUrl, effect: 'fadeOut', volume: 1 };
    } else if (project.musicTrack?.base64) {
      // Shotstack accepte les data URI base64 pour l'audio
      soundtrack = { src: project.musicTrack.base64, effect: 'fadeOut', volume: 1 };
    }

    return {
      soundtrack,
      background: '#000000',
      tracks: [{ clips: trackClips }],
    };
  }

  /**
   * Soumet un rendu Shotstack.
   */
  async function submitRender(project) {
    const { apiKey, env } = getConfig();
    if (!apiKey) throw new Error('Clé API Shotstack non configurée');

    const timeline = buildTimeline(project);

    const payload = {
      timeline,
      output: {
        format: 'mp4',
        resolution: 'hd',    // 720p
        fps: 25,
        quality: 'high',
        destinations: [],
      },
    };

    // MOCK
    if (apiKey === 'MOCK' || apiKey?.startsWith('demo_')) {
      return `mock_render_${Date.now()}`;
    }

    const resp = await fetch(`${getBaseUrl(env)}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `Shotstack error ${resp.status}`);
    }

    const data = await resp.json();
    return data.response?.id;
  }

  /**
   * Poll le statut d'un rendu.
   */
  async function pollRender(renderId) {
    const { apiKey, env } = getConfig();

    if (apiKey === 'MOCK' || apiKey?.startsWith('demo_')) {
      await new Promise(r => setTimeout(r, 1000));
      return { status: 'done', url: null, progress: 100 };
    }

    const resp = await fetch(`${getBaseUrl(env)}/render/${renderId}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!resp.ok) throw new Error(`Poll render error ${resp.status}`);
    const data = await resp.json();
    const r = data.response;

    return {
      status: r.status,       // 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed'
      url: r.url || null,
      progress: r.progress || 0,
    };
  }

  /**
   * Soumet et attend la completion.
   */
  async function renderAndWait(project, onProgress) {
    const renderId = await submitRender(project);
    onProgress?.(5);

    let attempts = 0;
    while (attempts < 120) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const result = await pollRender(renderId);
      onProgress?.(Math.min(95, result.progress || (attempts / 120 * 90)));

      if (result.status === 'done') {
        onProgress?.(100);
        return result.url;
      }
      if (result.status === 'failed') {
        throw new Error('Shotstack: rendu échoué');
      }
    }
    throw new Error('Shotstack: timeout');
  }

  return { isConfigured, buildTimeline, submitRender, pollRender, renderAndWait };
})();
