/**
 * SUPER PIPE — State & Persistence
 * Tout est sauvegardé automatiquement dans localStorage.
 * Les images et vidéos sont stockées en base64 pour survie entre sessions.
 */

const STORAGE_KEY = 'superpipe_v1';

const State = (() => {
  // ── État en mémoire ──
  let _data = {
    // Config globale (APIs, accent)
    config: {
      accent: '#C9A84C',
      replicateApiKey: '',
      klingModel: 'kling3',  // nano | standard | pro | kling3
      shotstackApiKey: '',
      shotstackEnv: 'stage', // 'stage' | 'production'
      openrouterApiKey: '',           // OpenRouter API — génération prompts IA
      openrouterModel:  'anthropic/claude-sonnet-4-6', // Modèle par défaut
    },

    // Projet courant
    currentProjectId: null,

    // Projets sauvegardés
    projects: {},
  };

  // Structure d'un projet vierge
  function emptyProject(id) {
    return {
      id,
      name: 'Nouveau projet',
      genre: '',   // hip-hop | trap | reggae | afro | zouk | cinema
      bpm: '',
      duration: '',
      description: '',
      accentColor: '',  // surcharge accent pour ce projet
      createdAt: Date.now(),
      updatedAt: Date.now(),

      // Personnages CRef
      characters: [],  // { id, name, base64, type, locked, tenues:[] }

      // Lieux LRef
      locations: [],   // { id, name, base64, type, locked, angles:[] }

      // Script
      scriptText: '',
      scriptSections: [],  // { id, label, content, type }

      // Shots (legacy) + Rushes multishot Kling 3
      shots:  [],  // legacy
      rushes: [],  // { id, name, shots[], mode, aspectRatio, videoUrl, validated, createdAt }

      // Objets / Props
      objects: [],  // { id, name, category, description, imageUrl, generating, locked }

      // Titrages / VFX
      titrages: [],  // { id, prompt, styles, aspectRatio, imageUrl, generating, locked }

      // Piste musicale
      musicTrack: null,   // { name, base64, duration, bpm, size }

      // Modèle Kling pour ce projet (override config globale si défini)
      klingModel: '',     // '' = hérite de config | nano | standard | pro | kling3

      // Text overlays (injectés dans la timeline Shotstack)
      textOverlays: [],  // [{id, text, start, duration, position, fontSize, color}]

      // End card final
      endCard: {
        enabled:      true,
        duration:     4,
        title:        '',
        subtitle:     '',
        lines:        [],        // lignes de contact : adresse, tel, email, web
        bgColor:      '#F5F0E8',
        textColor:    '#1a1710',
        accentColor:  '#B8922A',
        logoBase64:   null,      // logo uploadé (data:image/...)
        logoPosition: 'top-center',
      },

      // Montage
      montageJobId: null,
      montageStatus: null,  // null | 'rendering' | 'done' | 'error'
      montageUrl: null,
      montageBase64: null,
    };
  }

  // ── Chargement depuis localStorage ──
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        _data = deepMerge(_data, parsed);
      }
    } catch (e) {
      console.warn('SuperPipe: erreur chargement localStorage', e);
    }
  }

  // ── Sauvegarde dans localStorage ──
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (e) {
      // Si quota dépassé (trop de base64), on sauvegarde sans les médias
      console.warn('SuperPipe: localStorage quota atteint, sauvegarde partielle');
      const slim = JSON.parse(JSON.stringify(_data));
      // Retirer les base64 lourds
      Object.values(slim.projects).forEach(p => {
        p.characters.forEach(c => { if (c.base64 && c.base64.length > 100000) c.base64 = null; });
        p.locations.forEach(l => { if (l.base64 && l.base64.length > 100000) l.base64 = null; });
        p.shots.forEach(s => { s.videoBase64 = null; });
        p.montageBase64 = null;
        if (p.musicTrack) p.musicTrack.base64 = null; // MP3 base64 retiré si quota dépassé
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slim)); } catch (_) {}
    }
  }

  // ── Deep merge ──
  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    Object.keys(source).forEach(k => {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = deepMerge(target[k] || {}, source[k]);
      } else {
        out[k] = source[k];
      }
    });
    return out;
  }

  // ── Projet courant ──
  function currentProject() {
    if (!_data.currentProjectId) return null;
    return _data.projects[_data.currentProjectId] || null;
  }

  function setCurrentProject(id) {
    _data.currentProjectId = id;
    save();
  }

  function createProject(name = 'Nouveau projet') {
    const id = 'proj_' + Date.now();
    _data.projects[id] = emptyProject(id);
    _data.projects[id].name = name;
    _data.currentProjectId = id;
    save();
    return id;
  }

  function deleteProject(id) {
    delete _data.projects[id];
    if (_data.currentProjectId === id) {
      const ids = Object.keys(_data.projects);
      _data.currentProjectId = ids.length > 0 ? ids[ids.length - 1] : null;
    }
    save();
  }

  function updateProject(patch) {
    const p = currentProject();
    if (!p) return;
    Object.assign(p, patch, { updatedAt: Date.now() });
    save();
  }

  // ── Config ──
  function getConfig() { return _data.config; }
  function updateConfig(patch) {
    Object.assign(_data.config, patch);
    save();
  }

  // ── Characters ──
  function addCharacter(char) {
    const p = currentProject();
    if (!p) return;
    p.characters.push({ id: 'char_' + Date.now(), locked: false, tenues: [], ...char });
    save();
  }
  function updateCharacter(id, patch) {
    const p = currentProject();
    if (!p) return;
    const c = p.characters.find(c => c.id === id);
    if (c) Object.assign(c, patch);
    save();
  }
  function removeCharacter(id) {
    const p = currentProject();
    if (!p) return;
    p.characters = p.characters.filter(c => c.id !== id);
    save();
  }
  function lockCharacter(id, state) {
    updateCharacter(id, { locked: state });
  }

  // ── Locations ──
  function addLocation(loc) {
    const p = currentProject();
    if (!p) return;
    p.locations.push({ id: 'loc_' + Date.now(), locked: false, angles: [], ...loc });
    save();
  }
  function updateLocation(id, patch) {
    const p = currentProject();
    if (!p) return;
    const l = p.locations.find(l => l.id === id);
    if (l) Object.assign(l, patch);
    save();
  }
  function removeLocation(id) {
    const p = currentProject();
    if (!p) return;
    p.locations = p.locations.filter(l => l.id !== id);
    save();
  }
  function lockLocation(id, state) {
    updateLocation(id, { locked: state });
  }

  // ── Shots ──
  function setShots(shots) {
    const p = currentProject();
    if (!p) return;
    p.shots = shots;
    save();
  }
  function updateShot(id, patch) {
    const p = currentProject();
    if (!p) return;
    const s = p.shots.find(s => s.id === id);
    if (s) Object.assign(s, patch);
    save();
  }

  // ── Montage ──
  function updateMontage(patch) {
    const p = currentProject();
    if (!p) return;
    Object.assign(p, patch);
    save();
  }

  // ── Projets list ──
  function allProjects() {
    return Object.values(_data.projects).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Init
  load();

  // Si aucun projet, en créer un
  if (Object.keys(_data.projects).length === 0) {
    createProject('Mon premier clip');
  }

  return {
    load, save,
    getConfig, updateConfig,
    currentProject, setCurrentProject, createProject, deleteProject, updateProject,
    addCharacter, updateCharacter, removeCharacter, lockCharacter,
    addLocation, updateLocation, removeLocation, lockLocation,
    setShots, updateShot,
    updateMontage,
    allProjects,
    raw: () => _data,
  };
})();
