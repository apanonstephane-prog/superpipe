/**
 * SUPER PIPE — OpenRouter API
 * Génération intelligente des prompts Kling 3 multishot
 *
 * Rôle : transforme une section de script + contexte projet
 *        en N prompts Kling 3 ultra-structurés prêts à l'emploi.
 *
 * OpenRouter : https://openrouter.ai/api/v1/chat/completions
 *   → Compatible format OpenAI
 *   → Support Claude, GPT-4o, Mistral, Llama, etc.
 *   → Auth: Bearer token
 */

const ClaudeAPI = (() => {

  const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

  function getModel() {
    return State.getConfig().openrouterModel || 'anthropic/claude-sonnet-4-6';
  }

  function getKey() {
    return State.getConfig().openrouterApiKey || '';
  }

  function isConfigured() {
    return !!State.getConfig().openrouterApiKey;
  }

  function isMock() {
    const key = getKey();
    return key === '' || key === 'MOCK' || key.startsWith('demo_');
  }

  // ─────────────────────────────────────────────────────────────────
  // GÉNÉRATION PRINCIPALE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Génère N prompts Kling 3 ultra-structurés pour une section de script.
   *
   * @param {object} section    — {type, label, content, _position}
   * @param {object} project    — projet courant (genre, BPM, script…)
   * @param {object} refTags    — {chars:[{name,tag}], locs:[{name,tag}], objs:[{name,tag}]}
   * @param {number} shotCount  — nombre exact de shots à produire
   * @returns {Promise<Array>}  — [{prompt, negativePrompt, duration, description}]
   */
  async function generateSectionPrompts(section, project, refTags, shotCount, onProgress) {
    if (isMock()) {
      onProgress?.('mock');
      return _fallbackGenerate(section, project, refTags, shotCount);
    }

    const playbook  = PromptEngine.getPlaybook(project.genre) || PromptEngine.getPlaybook('hip-hop');
    const bpm       = project.musicTrack?.bpm || parseInt(project.bpm) || 95;
    const beatDur   = (60 / bpm).toFixed(3);
    const avgDur    = Math.max(3, Math.round(PromptEngine.getAvgShotDuration(bpm, project.genre)));
    const sectionDef = PromptEngine.SECTION_TYPES[section.type] || PromptEngine.SECTION_TYPES['verse'];

    // Contexte visuel
    const charLines = refTags.chars.map(t => `  • ${t.tag} = ${t.name}`).join('\n');
    const locLines  = refTags.locs.map(t =>  `  • ${t.tag} = ${t.name}`).join('\n');
    const objLines  = refTags.objs.map(t =>  `  • ${t.tag} = ${t.name}`).join('\n');

    const systemPrompt = `You are a world-class music video director and AI cinematographer. You specialize in writing ultra-precise prompts for Kling v3 omni multishot video generation.

You know the Document Fondation 2026 rules deeply:
- MASTER RULE: Story → Performance → Eye trace → Rhythm → Sound → Effects
- Every cut must: reveal, accentuate, relaunch, breathe, or conclude
- Genre playbooks govern shot rhythm, density and transitions strictly
- Prompts MUST be in English for maximum Kling 3 performance

KLING 3 ULTRA PROMPT STRUCTURE (mandatory format):
[SUBJECT: <<<image_tag>>> + precise body action + micro-gesture detail] [CAMERA: exact movement + angle + speed] [ENVIRONMENT: <<<image_tag>>> + specific atmospheric detail] [LIGHTING: source + direction + quality + color temperature] [EMOTION: what the viewer viscerally feels in this shot] [STYLE: 4-5 genre-specific visual keywords] [TECHNICAL: cinematic, sharp focus, professional grade]

RULES:
1. Always use <<<image_X>>> tags to anchor visual references in the scene
2. Camera movements must be specific: "slow push in" not "camera moves"
3. Vary angles across the sequence (low/eye/high, wide/medium/close)
4. Each shot must earn its cut — no filler shots
5. Negative prompt must be precise and tailored to genre/section combo
6. Return ONLY valid minified JSON — no explanation, no markdown
7. CRITICAL: each prompt must be 400 characters maximum — be concise and dense

RESPONSE FORMAT:
{"shots":[{"prompt":"...","negativePrompt":"...","duration":X,"description":"brief label"}]}`;

    const style      = project.style        || '';
    const colorPal   = project.colorPalette  || '';
    const camLang    = project.cameraLanguage || '';
    const tone       = project.tone           || '';

    const userPrompt = `Generate exactly ${shotCount} Kling 3 multishot prompts for this music video section.

═══ PROJECT CONTEXT ═══
Genre: ${project.genre || 'hip-hop'} | ${playbook.label}
BPM: ${bpm} → beat = ${beatDur}s
Average shot duration: ${avgDur}s
Visual style: ${playbook.klingStyle}${style ? ` | ${style}` : ''}
${colorPal   ? `Color palette: ${colorPal}` : ''}
${camLang    ? `Camera language: ${camLang}` : ''}
${tone       ? `Emotional tone: ${tone}` : ''}
Camera approach: ${playbook.motionHint}
Project concept: ${project.description || 'music video clip'}

═══ SECTION ═══
Type: ${section.type} — ${sectionDef.klingHint}
Label: ${section.label || section.type}
Position in clip: ${section._position || 'mid-clip'}
Lyrics/Content:
"${section.content || '(no lyrics — visual sequence)'}"

Edit rhythm: ${playbook.cutTrigger}
Slow down on: ${playbook.slowDown}
DANGER to avoid: ${playbook.danger}
Section energy: ${sectionDef.cut}

═══ VISUAL REFERENCES ═══
${charLines || '  (no characters locked)'}
${locLines  || '  (no locations locked)'}
${objLines  || '  (no objects locked)'}

═══ REQUIREMENTS ═══
• Exactly ${shotCount} shots
• Each shot duration: ${avgDur}s (min 3s, max 7s)
• Sequence must flow cinematically — vary angles, respect eye trace
• Inject <<<image_X>>> tags into EVERY shot that has matching references
• For section type "${section.type}": apply rule "${sectionDef.cut}"
• The negative prompt must target genre "${project.genre}" failure modes specifically

Return minified JSON only — no markdown, no explanation.`;

    try {
      onProgress?.('calling');
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization':  `Bearer ${getKey()}`,
          'Content-Type':   'application/json',
          'HTTP-Referer':   'https://superpipe.app',
          'X-Title':        'SuperPipe',
        },
        body: JSON.stringify({
          model:      getModel(),
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter: erreur ${resp.status}`);
      }

      onProgress?.('parsing');
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '';

      // Extraire le JSON de la réponse
      const jsonMatch = text.match(/\{[\s\S]*"shots"[\s\S]*\}/);
      if (!jsonMatch) throw new Error('OpenRouter: réponse non-JSON — ' + text.substring(0, 100));

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.shots) || parsed.shots.length === 0) {
        throw new Error('OpenRouter: tableau shots vide ou manquant');
      }

      return parsed.shots.slice(0, shotCount).map((s, i) => ({
        prompt:         s.prompt         || '',
        negativePrompt: s.negativePrompt || 'blurry, low quality, watermark, text overlay, distorted, shaky, amateur',
        duration:       Math.max(3, Math.min(7, Math.round(parseFloat(s.duration) || avgDur))),
        description:    s.description    || `${section.label || section.type} — shot ${i + 1}`,
      }));

    } catch (e) {
      console.error('OpenRouter error:', e);
      Toast.info(`OpenRouter: ${e.message.substring(0, 60)}… — génération interne utilisée`);
      return _fallbackGenerate(section, project, refTags, shotCount);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FALLBACK INTERNE — si OpenRouter indisponible
  // ─────────────────────────────────────────────────────────────────

  function _fallbackGenerate(section, project, refTags, shotCount) {
    const playbook   = PromptEngine.getPlaybook(project.genre) || PromptEngine.getPlaybook('hip-hop');
    const bpm        = project.musicTrack?.bpm || parseInt(project.bpm) || 95;
    const avgDur     = Math.max(3, Math.round(PromptEngine.getAvgShotDuration(bpm, project.genre)));
    const sectionDef = PromptEngine.SECTION_TYPES[section.type] || PromptEngine.SECTION_TYPES['verse'];

    const charTag = refTags.chars[0]?.tag || '';
    const locTag  = refTags.locs[0]?.tag  || '';
    const objTag  = refTags.objs[0]?.tag  || '';

    const lines   = (section.content || '').split('\n').filter(l => l.trim());

    const cameraSequence = [
      'slow push in from medium to close-up, eye level',
      'low angle dolly forward, dramatic perspective',
      'static wide shot, environment reveal',
      'handheld medium shot, intimate energy',
      'crane down from high angle, establishing',
      'lateral tracking shot, fluid movement',
      'close-up face, rack focus to background',
      'POV camera, immersive first-person',
    ];

    const lightingOptions = [
      'golden hour backlit, rim light, warm shadows',
      'hard neon top light, deep shadows, colored fill',
      'soft diffused daylight, even exposure, clean',
      'practical lights only, gritty authentic feel',
      'high contrast strobe flashes, dramatic peaks',
      'blue-tinted night exterior, cool tones',
    ];

    const negativeMap = {
      trap:    'slow movement, talking head, boring composition, stock footage, bright cheerful colors',
      reggae:  'aggressive cuts, harsh lighting, urban grit, fast chaotic movement',
      afro:    'static locked-off shots, grey palette, indoor only, no energy',
      zouk:    'fast cuts, harsh light, crowd chaos, aggressive energy',
      'hip-hop': 'static wide shot only, no movement, low energy, amateur framing',
      cinema:  'shaky cam, random cuts, no narrative logic, video game aesthetic',
    };

    const negBase = negativeMap[project.genre] || 'blurry, low quality, watermark, amateur';

    return Array.from({ length: shotCount }, (_, i) => {
      const line    = lines[i % Math.max(1, lines.length)] || '';
      const cam     = cameraSequence[i % cameraSequence.length];
      const light   = lightingOptions[i % lightingOptions.length];

      const parts = [
        charTag
          ? `${charTag} ${sectionDef.klingHint}, ${i % 3 === 0 ? 'direct eye contact to camera' : i % 3 === 1 ? 'profile view, looking into distance' : 'dynamic body movement'}`
          : sectionDef.klingHint,
        cam,
        locTag ? `${locTag}, ${i % 2 === 0 ? 'deep background bokeh' : 'sharp environmental detail'}` : '',
        light,
        objTag && i % 4 === 0 ? `${objTag} featured prominently in frame` : '',
        line   ? `visual representation of: "${line.substring(0, 50)}"` : '',
        playbook.klingStyle,
        `${bpm} BPM music video, ${(60/bpm).toFixed(2)}s beat cycle, cut on ${sectionDef.cut}`,
        'cinematic grade, professional music video production, sharp focus, no grain',
      ].filter(Boolean).join('. ');

      return {
        prompt:         parts,
        negativePrompt: `${negBase}, watermark, text overlay, distorted faces, overexposed, underexposed, shaky cam, jump cuts without purpose`,
        duration:       avgDur,
        description:    `${section.label || section.type} — plan ${i + 1}`,
      };
    });
  }

  return { isConfigured, isMock, generateSectionPrompts };

})();
