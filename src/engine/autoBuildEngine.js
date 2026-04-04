/**
 * SUPER PIPE — Auto Build Engine
 *
 * Le cerveau du système. Transforme un prompt libre en blueprint de production complet.
 *
 * FLUX :
 *   1. parse(prompt)     → analyse l'intention via Claude ou fallback interne
 *   2. build(intent)     → génère un blueprint complet et exploitable
 *   3. apply(blueprint)  → injecte le blueprint dans le projet courant
 *
 * OUTPUT BLUEPRINT :
 *   { intent, deliverable, platform, duration, aspectRatio, genre,
 *     style, tone, characters[], locations[], scriptSections[],
 *     shotCount, hypotheses[], risks[], qaScore, budgetEstimate }
 */

const AutoBuildEngine = (() => {

  // ── TABLES DE CORRESPONDANCE POUR FALLBACK ──────────────────────────

  const PLATFORM_MAP = {
    instagram: { ratio: '9:16', label: 'Instagram Stories/Reels' },
    reels:     { ratio: '9:16', label: 'Instagram Reels' },
    tiktok:    { ratio: '9:16', label: 'TikTok' },
    stories:   { ratio: '9:16', label: 'Stories' },
    youtube:   { ratio: '16:9', label: 'YouTube' },
    cinéma:    { ratio: '21:9', label: 'Cinéma' },
    cinema:    { ratio: '21:9', label: 'Cinéma' },
    clip:      { ratio: '16:9', label: 'Clip YouTube' },
    facebook:  { ratio: '16:9', label: 'Facebook' },
  };

  const GENRE_KEYWORDS = {
    'hip-hop':  ['hip hop', 'hiphop', 'rap', 'rappeur', 'rappeurs', 'boom bap', 'trap rap'],
    trap:       ['trap', 'drill', 'banger', 'trap beat'],
    reggae:     ['reggae', 'dancehall', 'ragga', 'roots'],
    afro:       ['afro', 'afrobeat', 'afropop', 'afrotrap', 'amapiano'],
    zouk:       ['zouk', 'kizomba', 'kompa', 'baile'],
    pub:        ['pub', 'publicité', 'spot', 'commercial', 'marque', 'brand', 'produit', 'massage', 'restaurant', 'luxe pub'],
    cinema:     ['film', 'cinéma', 'court métrage', 'séquence', 'scène', 'teaser', 'trailer'],
    'hip-hop':  ['urban', 'street', 'urbain'],
  };

  const DURATION_PATTERNS = [
    { re: /(\d+)\s*(?:secondes?|sec|s\b)/i,  fn: m => parseInt(m[1]) },
    { re: /(\d+)\s*(?:minutes?|min|mn)/i,    fn: m => parseInt(m[1]) * 60 },
    { re: /(\d+):(\d+)/,                     fn: m => parseInt(m[1]) * 60 + parseInt(m[2]) },
    { re: /(?:clip|clip musical)/i,           fn: () => 210 },   // 3:30 standard
    { re: /(?:pub|publicité|spot)\b/i,        fn: () => 30 },    // 30s pub standard
    { re: /teaser/i,                          fn: () => 60 },    // 60s teaser
    { re: /court[-\s]métrage/i,              fn: () => 600 },   // 10min court
  ];

  const STYLE_KEYWORDS = {
    'sombre':       'dark, moody, low-key lighting, deep shadows',
    'luxe':         'luxury, premium, clean, editorial, high-end fashion',
    'premium':      'premium, polished, cinematic grade, professional',
    'cyberpunk':    'cyberpunk, neon lights, futuristic, dark dystopian city',
    'cinématique':  'cinematic, film grain, anamorphic lens, wide aspect',
    'réaliste':     'photorealistic, documentary style, authentic, raw',
    'coloré':       'vibrant colors, saturated, bold palette, energetic',
    'vintage':      'vintage film look, grain, warm tones, retro',
    'minimaliste':  'minimalist, clean background, simple composition',
    'tropical':     'tropical, warm light, palm trees, caribbean vibes',
    'urbain':       'urban, city streets, concrete, gritty, street photography',
  };

  // ── PARSER VIA CLAUDE ────────────────────────────────────────────────

  async function _parseWithClaude(prompt) {
    const cfg = State.getConfig();
    if (!cfg.openrouterApiKey) return null;

    const systemPrompt = `You are an AI production director for a video production pipeline called SuperPipe.
Your job is to analyze a user's production intent and return a precise, structured JSON blueprint.

You must ALWAYS return valid JSON. No markdown. No explanations. Only JSON.

Return this exact structure:
{
  "intent": "one sentence summary of what user wants to produce",
  "deliverable": "clip|pub|teaser|court-métrage|film|social|autre",
  "platform": "youtube|instagram|tiktok|cinema|broadcast|web",
  "duration": 180,
  "aspectRatio": "16:9|9:16|1:1|21:9|4:3",
  "genre": "hip-hop|trap|reggae|afro|zouk|pub|cinema|autre",
  "bpm": 95,
  "style": "cinematic visual style description in 10 words max",
  "tone": "emotional tone in 5 words max",
  "colorPalette": "dominant colors description",
  "characters": [
    { "name": "character name", "description": "visual description for AI image generation", "role": "protagonist|featured|background" }
  ],
  "locations": [
    { "name": "location name", "description": "visual description for AI image generation", "mood": "atmosphere/time of day" }
  ],
  "objects": [
    { "name": "object name", "description": "visual description", "importance": "hero|prop|background" }
  ],
  "scriptSections": [
    { "type": "intro|verse|chorus|bridge|outro|sequence", "label": "Section name", "duration": 15, "content": "Description of what happens visually in this section" }
  ],
  "shotCount": 8,
  "cameraLanguage": "camera movement and angle description",
  "continuity": "continuity constraints to maintain",
  "hypotheses": ["list of inferences made from the prompt"],
  "risks": ["potential production risks or missing information"],
  "qaScore": 80,
  "budgetEstimate": "~$X.XX"
}

Rules:
- duration is in seconds
- bpm: infer from genre (hip-hop: 85-100, trap: 130-145, reggae: 70-90, afro: 100-120, pub: 0 if N/A)
- shotCount: duration / 15 for clips, duration / 10 for pubs, min 3, max 20
- hypotheses: ALWAYS list what you inferred that was not explicit in the prompt
- qaScore: 0-100, based on prompt clarity and completeness
- budgetEstimate: rough estimate based on shotCount × $0.15 for Kling 3`;

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.openrouterApiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://superpipe.app',
        'X-Title':       'SuperPipe',
      },
      body: JSON.stringify({
        model:      cfg.openrouterModel || 'anthropic/claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: `Analyse ce projet et retourne le blueprint JSON :\n\n"${prompt}"` },
        ],
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }

  // ── PARSER FALLBACK INTERNE ──────────────────────────────────────────

  function _fallbackParse(prompt) {
    const lower = prompt.toLowerCase();

    // Plateforme & ratio
    let platform   = 'youtube';
    let aspectRatio = '16:9';
    for (const [key, val] of Object.entries(PLATFORM_MAP)) {
      if (lower.includes(key)) {
        platform    = key;
        aspectRatio = val.ratio;
        break;
      }
    }

    // Genre
    let genre = 'hip-hop';
    for (const [g, keywords] of Object.entries(GENRE_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) { genre = g; break; }
    }
    if (lower.includes('pub') || lower.includes('publicité') || lower.includes('spot') ||
        lower.includes('commercial') || lower.includes('marque')) genre = 'pub';

    // Durée
    let duration = genre === 'pub' ? 30 : 210;
    for (const { re, fn } of DURATION_PATTERNS) {
      const m = prompt.match(re);
      if (m) { duration = fn(m); break; }
    }

    // Deliverable
    let deliverable = 'clip';
    if (genre === 'pub') deliverable = 'pub';
    if (lower.includes('teaser'))      deliverable = 'teaser';
    if (lower.includes('court'))       deliverable = 'court-métrage';
    if (lower.includes('film'))        deliverable = 'film';
    if (lower.includes('instagram') || lower.includes('tiktok') || lower.includes('reel')) deliverable = 'social';

    // BPM par genre
    const bpmMap = { 'hip-hop': 90, trap: 140, reggae: 80, afro: 110, zouk: 75, pub: 0, cinema: 0 };
    const bpm = bpmMap[genre] || 90;

    // Style
    let style = 'cinematic, professional, high quality';
    const detectedStyles = [];
    for (const [key, desc] of Object.entries(STYLE_KEYWORDS)) {
      if (lower.includes(key)) detectedStyles.push(desc);
    }
    if (detectedStyles.length > 0) style = detectedStyles.join(', ');

    // Ton
    let tone = 'neutre, professionnel';
    if (lower.includes('sombre') || lower.includes('dark'))         tone = 'sombre, intense, dramatique';
    if (lower.includes('luxe') || lower.includes('premium'))       tone = 'luxueux, raffiné, élégant';
    if (lower.includes('énergique') || lower.includes('dynamique')) tone = 'énergique, rythmé, intense';
    if (lower.includes('romantique') || lower.includes('amour'))   tone = 'romantique, doux, émotionnel';

    // Personnages
    const characters = [];
    const charMatch = prompt.match(/(\d+)\s*personnage/i);
    const charCount = charMatch ? parseInt(charMatch[1]) : (genre === 'pub' ? 1 : 1);
    for (let i = 0; i < Math.min(charCount, 3); i++) {
      characters.push({
        name: `Personnage ${i + 1}`,
        description: `${tone}, tenue cohérente avec le style ${style}`,
        role: i === 0 ? 'protagonist' : 'featured',
      });
    }

    // Lieux
    const locations = [];
    const locCount = Math.min(Math.ceil(duration / 60), 3);
    const locBase = lower.includes('martinique') ? 'Martinique' :
                    lower.includes('paris')      ? 'Paris' :
                    lower.includes('new york')   ? 'New York' : 'Lieu principal';
    for (let i = 0; i < locCount; i++) {
      locations.push({
        name: `${locBase} — Décor ${i + 1}`,
        description: `Lieu adapté au style ${style}, ${tone}`,
        mood: lower.includes('nuit') ? 'nuit' : lower.includes('jour') ? 'jour, lumière naturelle' : 'golden hour',
      });
    }

    // Sections script
    const shotCount  = Math.max(4, Math.min(20, Math.round(duration / 15)));
    const scriptSections = _buildScriptStructure(genre, duration, prompt);

    // Hypothèses
    const hypotheses = [
      `Format ${aspectRatio} ${platform !== 'youtube' ? `déduit — destination ${platform}` : 'standard (16:9)'}`,
      `Durée ${Math.floor(duration / 60)}min${duration % 60 > 0 ? String(duration % 60).padStart(2, '0') + 's' : ''} ${charMatch ? 'spécifiée' : 'estimée d\'après le type de livrable'}`,
      `Genre "${genre}" ${Object.entries(GENRE_KEYWORDS).some(([g, kw]) => kw.some(k => lower.includes(k))) ? 'détecté dans le prompt' : 'attribué par défaut'}`,
      `${shotCount} shots estimés pour cette durée (1 shot / ~15s)`,
      `${characters.length} personnage(s) · ${locations.length} lieu(x) générés automatiquement`,
    ];
    if (bpm > 0) hypotheses.push(`BPM ${bpm} estimé pour le genre ${genre}`);

    // Risques
    const risks = [];
    if (prompt.length < 30)  risks.push('Prompt très court — descriptions générées seront génériques');
    if (characters.length === 0) risks.push('Aucun personnage détecté — pipeline image-only');
    if (!lower.includes('couleur') && !lower.includes('lumière')) risks.push('Palette colorimétrique non spécifiée — style générique appliqué');

    const qaScore = Math.min(95, Math.max(30,
      40 +
      (prompt.length > 50 ? 15 : 0) +
      (detectedStyles.length > 0 ? 10 : 0) +
      (characters.length > 0 ? 10 : 0) +
      (locations.length > 0 ? 10 : 0) +
      (platform !== 'youtube' ? 5 : 0) +
      (risks.length === 0 ? 10 : 0)
    ));

    return {
      intent:         prompt.substring(0, 120),
      deliverable,
      platform,
      duration,
      aspectRatio,
      genre,
      bpm,
      style,
      tone,
      colorPalette:   detectedStyles.length > 0 ? detectedStyles[0] : 'palette cinématique naturelle',
      characters,
      locations,
      objects:        [],
      scriptSections,
      shotCount,
      cameraLanguage: genre === 'pub' ? 'mouvements doux et fluides, plans larges + gros plans produit' :
                      genre === 'trap' ? 'angles bas dramatiques, zooms rapides, steadicam' :
                      'mouvements variés, plans larges + plans serrés alternés',
      continuity:     `Cohérence de ${tone} tout au long, palette colorimétrique uniforme`,
      hypotheses,
      risks,
      qaScore,
      budgetEstimate: `~$${(shotCount * 0.15).toFixed(2)} en génération Kling 3`,
    };
  }

  function _buildScriptStructure(genre, duration, prompt) {
    const lower = prompt.toLowerCase();

    if (genre === 'pub') {
      return [
        { type: 'intro',    label: 'Accroche',   duration: Math.round(duration * 0.2), content: 'Plan d\'accroche fort, produit ou ambiance en révélation' },
        { type: 'verse',    label: 'Démonstration', duration: Math.round(duration * 0.5), content: 'Bénéfices produit, scènes d\'usage, lifestyle' },
        { type: 'outro',    label: 'Call to Action', duration: Math.round(duration * 0.3), content: 'Branding final, logo, tagline, contact' },
      ];
    }

    if (genre === 'cinema' || lower.includes('court') || lower.includes('film')) {
      return [
        { type: 'intro',   label: 'Ouverture',    duration: Math.round(duration * 0.15), content: 'Établissement du monde et des personnages' },
        { type: 'verse',   label: 'Acte 1',       duration: Math.round(duration * 0.25), content: 'Introduction du conflit ou de la situation' },
        { type: 'chorus',  label: 'Acte 2',       duration: Math.round(duration * 0.35), content: 'Développement, tension, montée en puissance' },
        { type: 'bridge',  label: 'Climax',       duration: Math.round(duration * 0.15), content: 'Point culminant de la narration' },
        { type: 'outro',   label: 'Résolution',   duration: Math.round(duration * 0.10), content: 'Dénouement, conclusion' },
      ];
    }

    // Clip musical standard
    const shotDuration = Math.round(duration * 0.08);
    return [
      { type: 'intro',   label: 'Intro',      duration: Math.round(duration * 0.10), content: 'Plans d\'ambiance, reveal du lieu principal, pas encore de performance' },
      { type: 'verse',   label: 'Couplet 1',  duration: Math.round(duration * 0.22), content: 'Performance et storytelling, plans alternant visage et corps' },
      { type: 'chorus',  label: 'Refrain 1',  duration: Math.round(duration * 0.16), content: 'Plans larges dynamiques, énergie maximale, angles variés' },
      { type: 'verse',   label: 'Couplet 2',  duration: Math.round(duration * 0.20), content: 'Variation de lieu ou d\'angle, progression narrative' },
      { type: 'chorus',  label: 'Refrain 2',  duration: Math.round(duration * 0.14), content: 'Répétition refrain avec nouvelles variations visuelles' },
      { type: 'bridge',  label: 'Bridge',     duration: Math.round(duration * 0.08), content: 'Rupture visuelle, plan symbolique, ralenti' },
      { type: 'outro',   label: 'Outro',      duration: Math.round(duration * 0.10), content: 'Conclusion, plan final fort, fade out progressif' },
    ];
  }

  // ── POINT D'ENTRÉE PRINCIPAL ─────────────────────────────────────────

  async function parse(prompt) {
    if (!prompt?.trim()) throw new Error('Prompt vide');

    // Essayer Claude en premier
    try {
      const claudeResult = await _parseWithClaude(prompt);
      if (claudeResult) return claudeResult;
    } catch (e) {
      console.warn('AutoBuild: Claude indisponible, fallback interne :', e.message);
    }

    // Fallback interne toujours disponible
    return _fallbackParse(prompt);
  }

  // ── APPLICATION DU BLUEPRINT AU PROJET ──────────────────────────────

  function apply(blueprint) {
    const p = State.currentProject();
    if (!p) throw new Error('Aucun projet actif');

    // 1. Paramètres projet (incluant style, colorPalette, cameraLanguage du blueprint)
    State.updateProject({
      description:    blueprint.intent,
      genre:          blueprint.genre,
      bpm:            blueprint.bpm || p.bpm || '',
      duration:       blueprint.duration > 0 ? _formatDuration(blueprint.duration) : p.duration,
      aspectRatio:    blueprint.aspectRatio  || p.aspectRatio  || '16:9',
      style:          blueprint.style        || p.style        || '',
      colorPalette:   blueprint.colorPalette || p.colorPalette || '',
      cameraLanguage: blueprint.cameraLanguage || p.cameraLanguage || '',
      tone:           blueprint.tone         || p.tone         || '',
      platform:       blueprint.platform     || p.platform     || '',
      intent:         blueprint,  // stocker le blueprint complet
    });

    // 2. Script sections (remplace si vide, propose sinon)
    if ((p.scriptSections || []).length === 0) {
      const sections = blueprint.scriptSections.map((s, i) => ({
        id:      `sec_${Date.now()}_${i}`,
        type:    s.type,
        label:   s.label,
        content: s.content,
        duration: s.duration,
      }));
      State.updateProject({ scriptSections: sections });
    }

    // 3. Personnages suggérés (ajouter ceux qui n'existent pas encore)
    if ((p.characters || []).length === 0) {
      blueprint.characters.forEach(c => {
        State.addCharacter({
          name:        c.name,
          description: c.description,
          role:        c.role,
          base64:      null,
          generatedBase: null,
          type:        'suggested',
          locked:      false,
          tenues:      [],
        });
      });
    }

    // 4. Lieux suggérés (ajouter si vide)
    if ((p.locations || []).length === 0) {
      blueprint.locations.forEach(l => {
        State.addLocation({
          name:       l.name,
          mood:       l.mood,
          promptDesc: l.description,
          imageUrl:   null,
          base64:     null,
          type:       'suggested',
          locked:     false,
          angles:     [],
        });
      });
    }

    // 5. Objets suggérés depuis le blueprint (ajouter si vide)
    if ((p.objects || []).length === 0 && (blueprint.objects || []).length > 0) {
      const updatedP = State.currentProject();
      const newObjs = blueprint.objects.map((o, i) => ({
        id:          `obj_${Date.now()}_${i}`,
        name:        o.name,
        category:    'prop',
        description: o.description,
        imageUrl:    null,
        generating:  false,
        locked:      false,
        importance:  o.importance || 'prop',
        type:        'suggested',
      }));
      State.updateProject({ objects: newObjs });
    }
  }

  function _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
  }

  return { parse, apply };

})();
