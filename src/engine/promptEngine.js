/**
 * SUPER PIPE — Prompt Engine
 * Traduction script → prompts Kling multishot
 * Règles intégrées depuis le Document Fondation Montage 2026
 *
 * LOGIQUE CENTRALE :
 *   1. La piste MP3 fournit le BPM réel et la durée totale
 *   2. Le genre définit le ratio beats/shot (ex. trap = 0.5 beat, reggae = 4 beats)
 *   3. La durée de chaque shot = (beats/shot) × (60/BPM) → calée sur la musique
 *   4. Le nombre total de shots = durée_piste / durée_shot_moyenne
 *   5. Les prompts intègrent le contexte narratif + CRef + LRef + style genre + BPM hint
 */

const PromptEngine = (() => {

  // ── Playbooks par genre (Document Fondation §6 + §3.3) ──
  const GENRE_PLAYBOOKS = {
    'hip-hop': {
      label:        'Hip-hop',
      icon:         '🎤',
      tempo:        '85–115 BPM',
      shotDuration: '0.8–2.5s',
      beatsPerShot: 2.5,      // beats par shot (valeur cible)
      beatsMin:     1.5,
      beatsMax:     4,
      density:      'dynamique selon énergie',
      cutTrigger:   'punchline, ad-lib, geste vers caméra, percussion',
      slowDown:     'regard, menace calme, ligne lourde, silence',
      transitions:  'regard caméra, geste main, pivot de buste, pas avant, objet-signature',
      danger:       'surcouper et perdre le poids des lignes',
      refrain:      'ancrer iconographie et motifs de marque',
      klingStyle:   'cinematic hip-hop video, urban environment, confident performance, direct camera, sharp cuts',
      motionHint:   'medium shot to close-up, steady or handheld, direct eye contact',
    },
    'trap': {
      label:        'Trap',
      icon:         '🔥',
      tempo:        '130–150 BPM (sensation half-time)',
      shotDuration: '0.5–1.5s',
      beatsPerShot: 1,
      beatsMin:     0.5,
      beatsMax:     2,
      density:      'haute avec respirations ponctuelles',
      cutTrigger:   'hi-hats, snare, switch, impact 808, smash-in',
      slowDown:     'drop vide, break, menace avant impact',
      transitions:  'hard cuts, whip-motions, inserts ultra-courts, flash cuts',
      danger:       'montage TikTok uniforme sans hiérarchie',
      refrain:      'énergie maximale, texture, impact',
      klingStyle:   'trap music video, dark aesthetic, aggressive energy, fast cuts, urban night, moody lighting',
      motionHint:   'quick movement, low angles, dramatic shadows, slow motion on impact',
    },
    'reggae': {
      label:        'Reggae',
      icon:         '🌿',
      tempo:        '80–90 BPM',
      shotDuration: '2–5s',
      beatsPerShot: 4,
      beatsMin:     3,
      beatsMax:     8,
      density:      'basse, respirante',
      cutTrigger:   'accent batterie, réponse instrumentale, foule/live',
      slowDown:     'message, groove, communion, nature',
      transitions:  'sway, pas lents, live band, environnement naturel, foule',
      danger:       'densité de coupe trop urbaine qui tue le skank/groove',
      refrain:      'laisser durer les plans porteurs de message',
      klingStyle:   'reggae music video, natural light, vibrant colors, soulful performance, community, nature',
      motionHint:   'wide establishing shots, slow pans, natural environment, warm golden light',
    },
    'afro': {
      label:        'Afro / Afrobeats',
      icon:         '🥁',
      tempo:        '95–115 BPM',
      shotDuration: '1–3s',
      beatsPerShot: 2,
      beatsMin:     1,
      beatsMax:     4,
      density:      'rythmique, corporelle',
      cutTrigger:   'groove percussif, call-and-response, danse, steps',
      slowDown:     'déhanchement, choré, regard, sensualité',
      transitions:  'mouvement de hanche/épaule, éléments de fête, motifs percussifs',
      danger:       'sous-exploiter la danse ou découper sans respecter le groove du corps',
      refrain:      'pulsation corporelle, collectif, couleur',
      klingStyle:   'afrobeats music video, vibrant colors, energetic dance, joyful atmosphere, African aesthetics',
      motionHint:   'full body shots, dance focus, bright colors, crowd energy, celebration',
    },
    'zouk': {
      label:        'Zouk / Love',
      icon:         '💫',
      tempo:        '80–100 BPM',
      shotDuration: '2–5s',
      beatsPerShot: 4,
      beatsMin:     2.5,
      beatsMax:     8,
      density:      'fluide, par phrases',
      cutTrigger:   'accents de phrase, mouvement de corps, montée sentimentale',
      slowDown:     'connexion, peau, geste, émotion',
      transitions:  'mains, visages, glissements, tissus, cheveux, respiration',
      danger:       'couper comme de la trap sur un morceau qui réclame sensualité',
      refrain:      'penser phrase plus que percussion',
      klingStyle:   'zouk love video, intimate atmosphere, sensual movement, soft warm light, romantic',
      motionHint:   'close-up hands and faces, flowing fabric, soft bokeh, golden hour light',
    },
    'cinema': {
      label:        'Cinéma / Fiction',
      icon:         '🎬',
      tempo:        'variable selon scène',
      shotDuration: '1.5–6s',
      beatsPerShot: 3,
      beatsMin:     1.5,
      beatsMax:     10,
      density:      'modulée par émotion dramatique',
      cutTrigger:   'changement de point de vue, tension, révélation',
      slowDown:     'silence, réaction, contemplation, poids émotionnel',
      transitions:  'eye trace, mouvement, lumière, texture, son',
      danger:       'remplir tous les vides par peur du calme',
      refrain:      'macro-rythme sur le film entier',
      klingStyle:   'cinematic film, dramatic lighting, narrative focus, character driven, professional cinematography',
      motionHint:   'carefully composed frames, motivated camera movement, dramatic shadows',
    },

    // ── PUBLICITÉ ──────────────────────────────────────────────────
    'pub': {
      label:        'Publicité',
      icon:         '📺',
      tempo:        'Format 15s / 30s / 60s',
      shotDuration: '1–4s',
      beatsPerShot: 2,
      beatsMin:     1,
      beatsMax:     6,
      density:      'maximale — chaque seconde doit gagner l\'attention ou la conviction',
      cutTrigger:   'hook émotionnel, démonstration produit, changement de bénéfice, CTA',
      slowDown:     'produit en gros plan, émotion testimoniale, signature marque, nom du produit',
      transitions:  'cut dur sur bénéfice, match-cut produit, dissolve sur émotion, whip sur action',
      danger:       'montrer le produit sans créer le désir — toute image doit vendre une émotion, pas une caractéristique',
      refrain:      'plan signature produit ou visage testimonial — revient à la fin pour ancrer',
      klingStyle:   'high-end commercial advertising, aspirational lifestyle, product hero shot, premium quality, clean aesthetic, brand identity',
      motionHint:   'precise product framing, beauty shots with perfect lighting, aspirational character movement, brand-consistent color palette',
      // Spécificités pub
      formats:      ['15s (teaser)', '30s (standard)', '60s (brand film)'],
      structure3:   'Hook (0–5s) → Bénéfice / Demo (5–25s) → CTA + Signature (25–30s)',
      pillarsPub:   'Attention → Intérêt → Désir → Action (AIDA)',
    },

    // ── COURT MÉTRAGE ──────────────────────────────────────────────
    'court': {
      label:        'Court métrage',
      icon:         '🎞',
      tempo:        '1–30 min',
      shotDuration: '2–8s',
      beatsPerShot: 3,
      beatsMin:     2,
      beatsMax:     15,
      density:      'économie narrative absolue — chaque plan doit avoir une fonction dramatique, aucun plan parasite',
      cutTrigger:   'regard révélateur, geste décisif, dialogue clé, obstacle dramatique, retournement',
      slowDown:     'moment de vérité, prise de conscience du personnage, décision irréversible',
      transitions:  'raccord regard, raccord mouvement, ellipse narrative, cut sec sur tension, pont sonore',
      danger:       'personnage sous-développé — dans 15 min la scène 1 doit poser le personnage, l\'enjeu et le monde en même temps',
      refrain:      'plan récurrent à forte charge symbolique — revient transformé à la fin',
      klingStyle:   'short film, intimate close-up cinematography, arthouse quality, character-driven micro-storytelling, visual economy',
      motionHint:   'motivated camera only — no gratuitous movement, intimate close-ups for psychology, environmental details for world-building',
      structure3:   'Exposition condensée (0–20%) → Conflit et développement (20–80%) → Résolution ou bascule (80–100%)',
      pillarsFilm:  'Économie · Intensité · Mémorabilité',
    },

    // ── MOYEN MÉTRAGE ─────────────────────────────────────────────
    'moyen': {
      label:        'Moyen métrage',
      icon:         '🎬',
      tempo:        '30–70 min',
      shotDuration: '2–10s',
      beatsPerShot: 3.5,
      beatsMin:     2,
      beatsMax:     20,
      density:      'développée mais disciplinée — chaque séquence transforme le personnage ou l\'enjeu',
      cutTrigger:   'pivot dramatique, révélation de sous-intrigue, montée d\'enjeu, retournement de situation',
      slowDown:     'développement psychologique du personnage, world-building, tension silencieuse avant action',
      transitions:  'raccords physiques, ellipses montées, pont sonore, fondu sur rupture temporelle',
      danger:       'remplir la durée sans élever l\'enjeu — le personnage doit être transformé à la fin de chaque acte',
      refrain:      'leitmotiv visuel lié à l\'arc du personnage principal — revient à des moments charnières',
      klingStyle:   'medium-length feature film, deliberate narrative pace, developed characterization, cinematic scope, dramatic lighting design',
      motionHint:   'expressive camera reflecting character psychology, deliberate composition, motivated movement, atmospheric depth of field',
      structure3:   'Acte I exposition (0–25%) → Acte II confrontation/développement (25–75%) → Acte III climax/résolution (75–100%)',
      pillarsFilm:  'Développement · Tension croissante · Transformation',
    },

    // ── LONG MÉTRAGE ──────────────────────────────────────────────
    'long': {
      label:        'Long métrage',
      icon:         '🎥',
      tempo:        '> 70 min',
      shotDuration: '2–15s',
      beatsPerShot: 4,
      beatsMin:     2,
      beatsMax:     30,
      density:      'modulée sur 3 actes — dense aux points de retournement, respirante dans les développements, maximale au climax',
      cutTrigger:   'plot point majeur, retournement de paradigme, climax de séquence, révélation de personnage',
      slowDown:     'contemplation du monde, développement de sous-texte, moment iconique, respiration entre deux tempêtes dramatiques',
      transitions:  'toute la palette : raccord regard/mouvement/son/thème/association — choisir selon la fonction dramatique',
      danger:       'confondre le spectateur sur les enjeux — chaque sous-intrigue doit se connecter au thème central sans l\'affaiblir',
      refrain:      'plan signature du film — image iconique qui résume le propos, revient transformée au climax et à la conclusion',
      klingStyle:   'feature film, epic cinematic scope, masterful cinematography, layered storytelling, professional Hollywood or arthouse grade',
      motionHint:   'full cinematic arsenal — crane, dolly, Steadicam, rack focus, all justified by dramatic intent, nothing gratuitous',
      structure3:   'Acte I (0–25%) → Plot Point 1 (25%) → Acte II (25–75%) → Midpoint + Plot Point 2 → Acte III climax/dénouement (75–100%)',
      pillarsFilm:  'Ampleur · Profondeur · Résonance durable',
    },
  };

  // ── Règle maître (Document Fondation §9) ──
  const MASTER_RULE = `Story → Performance → Eye trace → Rhythm → Sound → Effects.
Monter pour l'émotion et la lisibilité d'abord. Toute coupe doit : révéler, accentuer, relancer, respirer ou conclure.`;

  // ── Sections types d'un clip / pub / film ──
  const SECTION_TYPES = {

    // ── CLIP MUSICAL ──────────────────────────────────────────────
    intro:      { label: 'Intro',           cat: 'clip', cut: 'lent, installation',             klingHint: 'establishing shot, world building, mood setting',                          beatsMult: 1.5 },
    verse:      { label: 'Couplet',         cat: 'clip', cut: 'narratif, détails perf',         klingHint: 'performance detail, storytelling, lyric connection',                       beatsMult: 1.0 },
    prechorus:  { label: 'Pré-refrain',     cat: 'clip', cut: 'compression, montée',            klingHint: 'building tension, anticipation, accelerating rhythm',                      beatsMult: 0.8 },
    chorus:     { label: 'Refrain',         cat: 'clip', cut: 'identité visuelle, motifs',      klingHint: 'iconic shot, maximum energy, brand identity moment, visual hook',          beatsMult: 0.7 },
    bridge:     { label: 'Bridge/Pont',     cat: 'clip', cut: 'rupture, contraste',             klingHint: 'change of perspective, emotional shift, narrative twist',                  beatsMult: 1.2 },
    breakdown:  { label: 'Breakdown',       cat: 'clip', cut: 'vide, silence, respiration',     klingHint: 'minimal, let it breathe, space and texture, no filler',                   beatsMult: 2.0 },
    outro:      { label: 'Outro',           cat: 'clip', cut: 'résolution, conclusion',         klingHint: 'resolution, fade out, closing image, final iconic moment',                 beatsMult: 1.5 },

    // ── PUBLICITÉ ─────────────────────────────────────────────────
    pub_hook:   { label: 'Hook',            cat: 'pub',  cut: 'impact immédiat, 0–3s',          klingHint: 'instant attention grab — surprising or emotionally arresting opening image',  beatsMult: 0.5 },
    pub_problem:{ label: 'Problème',        cat: 'pub',  cut: 'identification, empathie',        klingHint: 'relatable problem or pain point — viewer must recognise themselves',          beatsMult: 1.0 },
    pub_demo:   { label: 'Démonstration',   cat: 'pub',  cut: 'précis, lisible, convaincant',   klingHint: 'product in action — clear benefit demonstration, beauty shot or testimonial', beatsMult: 1.2 },
    pub_benefit:{ label: 'Bénéfice',        cat: 'pub',  cut: 'émotionnel, aspirationnel',      klingHint: 'aspirational lifestyle shot — the life after the product, desire creation',   beatsMult: 1.0 },
    pub_cta:    { label: 'CTA / Signature', cat: 'pub',  cut: 'net, mémorable, signature',      klingHint: 'brand signature — logo moment, tagline, product hero, final desire imprint',  beatsMult: 0.8 },

    // ── FILM ──────────────────────────────────────────────────────
    exposition: { label: 'Exposition',      cat: 'film', cut: 'installation, ancrage',          klingHint: 'world introduction — establish character, place, tone and central question',   beatsMult: 1.8 },
    inciting:   { label: 'Élément déclencheur', cat: 'film', cut: 'rupture nette',              klingHint: 'disruption — the event that breaks the ordinary world and forces action',      beatsMult: 0.7 },
    plot1:      { label: 'Plot Point 1',    cat: 'film', cut: 'pivot dramatique',               klingHint: 'point of no return — character commits, world changes irreversibly',           beatsMult: 0.7 },
    developt:   { label: 'Développement',   cat: 'film', cut: 'tension croissante',             klingHint: 'obstacles, revelations, character deepening — pressure builds steadily',       beatsMult: 1.2 },
    midpoint:   { label: 'Midpoint',        cat: 'film', cut: 'retournement mi-parcours',       klingHint: 'mid-film revelation that changes the stakes entirely — new direction',          beatsMult: 0.6 },
    crisis:     { label: 'Crise',           cat: 'film', cut: 'tension maximale',               klingHint: 'all-is-lost moment or climax build-up — maximum dramatic pressure',           beatsMult: 0.6 },
    climax:     { label: 'Climax',          cat: 'film', cut: 'tension libérée, net',           klingHint: 'peak confrontation — release all built tension in one decisive moment',        beatsMult: 0.5 },
    denouement: { label: 'Dénouement',      cat: 'film', cut: 'redescente, respiration',        klingHint: 'consequences of climax — world restructured, character transformed',           beatsMult: 1.8 },
    epilogue:   { label: 'Épilogue',        cat: 'film', cut: 'fermeture, résonance',           klingHint: 'final image — what the character (and viewer) carries away forever',           beatsMult: 2.0 },
    // Sections scène transversales (film tous formats)
    scene_action:   { label: 'Scène action',    cat: 'film', cut: 'dynamique, lisible',         klingHint: 'clear geography, kinetic energy, motivated fast cuts on impact beats',         beatsMult: 0.7 },
    scene_dialogue: { label: 'Scène dialogue',  cat: 'film', cut: 'shot/contre-shot, écoute',  klingHint: 'reaction is as important as action — cut on subtext, not just speech',         beatsMult: 1.4 },
    scene_silent:   { label: 'Scène silencieuse', cat: 'film', cut: 'long, contemplatif',       klingHint: 'environmental or character interiority — trust silence, no filler required',   beatsMult: 2.5 },

    // ── GÉNÉRIQUE ─────────────────────────────────────────────────
    scene:      { label: 'Scène',           cat: 'all',  cut: 'narratif',                       klingHint: 'cinematic scene, character driven, motivated action',                         beatsMult: 1.0 },
  };

  // ── Helpers BPM ──
  /**
   * Calcule la durée d'un shot en secondes à partir du BPM et du genre.
   * @param {number} bpm
   * @param {string} genre
   * @param {string} sectionType
   * @returns {number} durée en secondes
   */
  function calcShotDuration(bpm, genre, sectionType) {
    const playbook = GENRE_PLAYBOOKS[genre] || GENRE_PLAYBOOKS['hip-hop'];
    const section  = SECTION_TYPES[sectionType] || SECTION_TYPES['verse'];
    const beatDur  = 60 / bpm;
    const beats    = playbook.beatsPerShot * (section.beatsMult || 1.0);
    // Clamp dans les bornes du genre
    const min = playbook.beatsMin * beatDur;
    const max = playbook.beatsMax * beatDur;
    const raw = beats * beatDur;
    return Math.round(Math.min(Math.max(raw, min), max) * 10) / 10;
  }

  /**
   * Nombre de shots par minute selon le genre et le BPM.
   */
  function getShotsPerMinute(bpm, genre) {
    const playbook = GENRE_PLAYBOOKS[genre] || GENRE_PLAYBOOKS['hip-hop'];
    const beatDur  = 60 / bpm;
    return Math.round(60 / (playbook.beatsPerShot * beatDur));
  }

  /**
   * Durée moyenne d'un shot en secondes.
   */
  function getAvgShotDuration(bpm, genre) {
    const playbook = GENRE_PLAYBOOKS[genre] || GENRE_PLAYBOOKS['hip-hop'];
    return Math.round((60 / bpm) * playbook.beatsPerShot * 10) / 10;
  }

  /**
   * Génère les prompts Kling pour chaque shot à partir du script.
   *
   * Si le projet a une piste musicale avec BPM + durée :
   *   → les durées sont calculées beat par beat
   *   → le nombre total de shots est calibré sur la durée réelle du morceau
   *
   * @param {object} project — projet courant
   * @returns {Array} shots avec prompts
   */
  function generateShots(project) {
    const playbook    = GENRE_PLAYBOOKS[project.genre] || GENRE_PLAYBOOKS['hip-hop'];
    const sections    = project.scriptSections || [];
    const lockedChars = (project.characters || []).filter(c => c.locked);
    const lockedLocs  = (project.locations  || []).filter(l => l.locked);

    // Récupération du BPM (piste > champ projet > défaut du genre)
    const trackBpm   = project.musicTrack?.bpm;
    const projBpm    = parseInt(project.bpm) || null;
    const bpm        = trackBpm || projBpm || _guessDefaultBpm(project.genre);
    const hasBpm     = !!(trackBpm || projBpm);

    // Durée totale du morceau
    const trackDuration = project.musicTrack?.duration || null;

    const shots = [];
    let shotIndex = 0;

    sections.forEach(section => {
      const sectionDef = SECTION_TYPES[section.type] || SECTION_TYPES['verse'];
      const lines = (section.content || '').split('\n').filter(l => l.trim());

      // Nombre de shots dans cette section
      // Si BPM + durée disponibles : on vise 1 shot toutes les beatsPerShot beats
      // Sinon : heuristique basée sur le nombre de lignes
      let shotCount;
      if (hasBpm && trackDuration && sections.length > 0) {
        const sectionDur = trackDuration / sections.length;
        const avgShotDur = calcShotDuration(bpm, project.genre, section.type);
        shotCount = Math.max(1, Math.round(sectionDur / avgShotDur));
      } else {
        shotCount = Math.max(1, Math.ceil(lines.length / 2));
      }

      for (let i = 0; i < shotCount; i++) {
        const lineChunk = lines.slice(i * 2, i * 2 + 2).join(' ') || (section.content || '').substring(0, 80);

        // Durée précise du shot
        const shotDur = hasBpm
          ? calcShotDuration(bpm, project.genre, section.type)
          : parseDuration(playbook.shotDuration);

        const shot = buildShotPrompt({
          index:           shotIndex++,
          section:         section.label || sectionDef.label,
          sectionType:     section.type,
          content:         lineChunk,
          playbook,
          sectionDef,
          lockedChars,
          lockedLocs,
          project,
          totalInSection:  shotCount,
          indexInSection:  i,
          bpm,
          hasBpm,
          shotDur,
        });
        shots.push(shot);
      }
    });

    return shots;
  }

  /**
   * Construit le prompt Kling pour un shot unique.
   * Structure : Style genre · Scène narrative · Personnages · Lieu · Caméra · Mood · Timing BPM · Contraintes
   */
  function buildShotPrompt({
    index, section, sectionType, content, playbook, sectionDef,
    lockedChars, lockedLocs, project, totalInSection, indexInSection,
    bpm, hasBpm, shotDur,
  }) {
    // ── Contexte personnages ──
    let charContext = '';
    if (lockedChars.length > 0) {
      charContext = lockedChars.map(c => {
        const tenue = (c.tenues || []).find(t => t.locked);
        return `${c.name}${tenue ? `, wearing ${tenue.description}` : ''}`;
      }).join('; ');
    }

    // ── Contexte lieu ──
    const loc = lockedLocs[0];
    const locContext = loc ? `Location: ${loc.name}` : '';

    // ── Hint timing musical ──
    let timingHint = '';
    if (hasBpm && bpm) {
      const beatDur = (60 / bpm).toFixed(2);
      timingHint = `Music: ${bpm} BPM, beat=${beatDur}s, cut on ${sectionDef.cut}`;
    }

    // ── Modificateurs par position dans la section ──
    let posHint = '';
    if (indexInSection === 0)                      posHint = 'opening of section';
    if (indexInSection === totalInSection - 1)     posHint = 'closing of section, resolve energy';
    if (sectionType === 'chorus' && indexInSection === 0) posHint = 'ICONIC MOMENT — brand identity shot';

    // ── Composition du prompt ──
    const parts = [
      playbook.klingStyle,
      content ? `Scene: ${content}` : '',
      charContext ? `Characters: ${charContext}` : '',
      locContext,
      `Camera: ${playbook.motionHint}`,
      `Mood: ${sectionDef.klingHint}`,
      timingHint,
      posHint ? `Position: ${posHint}` : '',
      `Quality: 720p, cinematic, professional music video, sharp focus`,
      `Avoid: watermark, text overlay, low quality, jump cut without purpose, stock footage`,
    ].filter(Boolean).join('. ');

    // ── Prompt négatif ──
    const negParts = [
      'blurry, low quality, pixelated, watermark, text, logo, distorted face',
      (sectionType === 'zouk' || sectionType === 'reggae') ? 'aggressive cuts, fast movement, harsh lighting' : '',
      (sectionType === 'trap')  ? 'slow panning, talking head only, boring composition' : '',
      (sectionType === 'breakdown') ? 'busy scene, crowd, chaotic movement' : '',
    ].filter(Boolean).join(', ');

    return {
      id:            `shot_${Date.now()}_${index}`,
      index,
      section,
      sectionType,
      scriptContent: content,
      prompt:        parts,
      negativePrompt: negParts,
      duration:      shotDur || parseDuration(playbook.shotDuration),
      bpm:           bpm || null,
      klingJobId:    null,
      status:        'pending',  // pending | generating | done | error
      videoUrl:      null,
      videoBase64:   null,
      validated:     false,
      createdAt:     Date.now(),
    };
  }

  // ── Utilitaires ──
  function parseDuration(rangeStr) {
    const match = rangeStr.match(/([\d.]+)[–\-]([\d.]+)/);
    if (match) return Math.round((parseFloat(match[1]) + parseFloat(match[2])) / 2 * 10) / 10;
    return 2;
  }

  function _guessDefaultBpm(genre) {
    const defaults = {
      // Clip musical
      'hip-hop': 95,
      'trap':    140,
      'reggae':  85,
      'afro':    105,
      'zouk':    90,
      'cinema':  100,
      // Publicité — équivalent tempo interne (shot duration ciblée ~2s)
      'pub':     120,
      // Film — le "BPM" est une métaphore du tempo dramatique
      // (valeurs choisies pour obtenir des durées de shot réalistes via la formule)
      'court':   90,   // → ~2s/shot avec beatsPerShot=3
      'moyen':   85,   // → ~2.5s/shot
      'long':    80,   // → ~3s/shot
    };
    return defaults[genre] || 95;
  }

  /**
   * Retourne les sections types d'un genre donné.
   * Pub → sections pub. Film → sections film. Clip → sections clip.
   */
  function getSectionTypesForGenre(genre) {
    const catMap = {
      'pub':    'pub',
      'court':  'film',
      'moyen':  'film',
      'long':   'film',
    };
    const cat = catMap[genre] || 'clip';
    return Object.entries(SECTION_TYPES)
      .filter(([, v]) => v.cat === cat || v.cat === 'all')
      .map(([key, val]) => ({ key, ...val }));
  }

  function getPlaybook(genre) {
    return GENRE_PLAYBOOKS[genre] || null;
  }

  function getAllGenres() {
    return Object.entries(GENRE_PLAYBOOKS).map(([key, val]) => ({ key, ...val }));
  }

  /**
   * Calcule le plan de rushes pour une section :
   *   - Nombre de shots basé sur BPM + genre + durée de section
   *   - Durée effective par shot (min 3s contrainte Kling 3)
   *   - Répartition en rushes (max 6 shots et max 15s par rush)
   *
   * @param {object} section  — section du script
   * @param {object} project  — projet courant
   * @param {number} sectionDuration — durée de la section en secondes
   * @returns {object} { shotCount, rushCount, avgShotDur, totalDuration, rushGroups }
   */
  function planSectionRushes(section, project, sectionDuration) {
    const playbook    = GENRE_PLAYBOOKS[project.genre] || GENRE_PLAYBOOKS['hip-hop'];
    const bpm         = project.musicTrack?.bpm || parseInt(project.bpm) || 95;
    const rawAvgDur   = calcShotDuration(bpm, project.genre, section.type);
    const avgShotDur  = Math.max(3, Math.round(rawAvgDur));  // Kling 3 min = 3s

    const totalDuration = sectionDuration || 25;
    const shotCount     = Math.max(1, Math.round(totalDuration / avgShotDur));

    // Packer les shots en rushes (max 6 shots, max 15s)
    const rushGroups = [];
    let current      = { shots: 0, duration: 0 };

    for (let i = 0; i < shotCount; i++) {
      if (current.shots >= 6 || current.duration + avgShotDur > 15) {
        rushGroups.push({ ...current });
        current = { shots: 0, duration: 0 };
      }
      current.shots++;
      current.duration += avgShotDur;
    }
    if (current.shots > 0) rushGroups.push(current);

    return {
      shotCount,
      rushCount:    rushGroups.length,
      avgShotDur,
      totalDuration: shotCount * avgShotDur,
      rushGroups,
    };
  }

  /**
   * Calcule la durée estimée d'une section à partir de la piste audio.
   * @param {object} project
   * @param {number} sectionIndex
   * @returns {number} durée en secondes
   */
  function estimateSectionDuration(project, sectionIndex) {
    const sections      = project.scriptSections || [];
    const trackDuration = project.musicTrack?.duration || 180;
    if (sections.length === 0) return trackDuration;
    return trackDuration / sections.length;
  }

  // ── Check-list QC Document Fondation §7 ──
  const QC_CHECKLIST = [
    'La perf labiale est crédible sur les lignes clés',
    'Les refrains reviennent avec variation, pas avec redite molle',
    'Chaque accélération a une raison musicale précise',
    'Il y a des contrastes de densité suffisants entre sections',
    'Les silences / breaks sont exploités (pas colmatés)',
    'Le regard du spectateur sait où aller à chaque coupe',
    'Le son est hiérarchisé (voix / musique / FX)',
    'Le clip tient sans VFX lourds ni gimmicks',
    'Il y a au moins un moment mémorable par section',
    'Le dernier refrain ou tiers surclasse le reste',
  ];

  // ── SOP Pipeline §5 (passes A→J) ──
  const SOP_PASSES = [
    { id: 'A', label: 'Pré-analyse',    desc: 'Découper en sections, noter downbeats, transitions, breaks' },
    { id: 'B', label: 'Ingest & Sync',  desc: 'Synchroniser perfs, nommer par section/décor/énergie/angle' },
    { id: 'C', label: 'Stringouts',     desc: 'Créer stringout par section et fonction' },
    { id: 'D', label: 'Assembly',       desc: 'Monter logique et lisibilité d\'abord' },
    { id: 'E', label: 'Musical cut',    desc: 'Placer accents structurants, pas chaque beat' },
    { id: 'F', label: 'Energy pass',    desc: 'Resserrement, micro-jumps, reframing, vitesse' },
    { id: 'G', label: 'Breath pass',    desc: 'Silences, tenues, pré-laps, plans laissés vivre' },
    { id: 'H', label: 'Sound pass',     desc: 'Impacts, wooshes, room tone, hiérarchie' },
    { id: 'I', label: 'Finishing',      desc: 'Conform, color, versions clean/explicit/vertical/horizontal' },
    { id: 'J', label: 'Review QC',      desc: 'Grand écran + téléphone + casque + enceintes' },
  ];

  return {
    generateShots,
    getPlaybook,
    getAllGenres,
    getSectionTypesForGenre,
    calcShotDuration,
    getShotsPerMinute,
    getAvgShotDuration,
    planSectionRushes,
    estimateSectionDuration,
    GENRE_PLAYBOOKS,
    SECTION_TYPES,
    MASTER_RULE,
    QC_CHECKLIST,
    SOP_PASSES,
  };
})();
