/**
 * MODULE PROJET — Paramètres du projet courant
 */

const ModuleProject = {

  render() {
    const p = State.currentProject();
    if (!p) {
      document.getElementById('module-project').innerHTML = '<div class="empty-state"><div class="empty-state-icon">◈</div><div>Aucun projet sélectionné</div></div>';
      return;
    }

    const genres = PromptEngine.getAllGenres();
    const playbook = PromptEngine.getPlaybook(p.genre);
    const cfg = State.getConfig();
    const activeModel = p.klingModel || cfg.klingModel || 'kling3';
    const track = p.musicTrack;

    document.getElementById('module-project').innerHTML = `

      <!-- ══════════════════════════════════════════════════════════
           AUTO BUILD — L'ENTRÉE INTELLIGENTE
      ══════════════════════════════════════════════════════════ -->
      <div class="card" style="border-color:var(--accent-border);background:linear-gradient(135deg,var(--bg-2) 0%,var(--bg-1) 100%)">

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--text-0);letter-spacing:-0.02em">
            ✦ AUTO BUILD
          </div>
          <div style="font-size:9px;font-family:var(--font-mono);color:var(--accent);background:var(--accent-dim);padding:3px 8px;border-radius:12px;border:1px solid var(--accent-border)">
            AI DIRECTOR
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:16px;line-height:1.5">
          Décris ce que tu veux produire. Le système comprend, structure, et construit automatiquement toute la chaîne de production.
        </div>

        <textarea id="autobuild-prompt" rows="4"
          style="font-size:13px;line-height:1.6;border-color:var(--accent-border)"
          placeholder="Ex: Je veux une pub 20 secondes premium pour un salon de massage en Martinique, ambiance tropicale luxe, format Instagram stories 9:16&#10;Ex: Clip hip-hop sombre 3 minutes, rappeur seul, rue la nuit, style cinématique&#10;Ex: Teaser luxe 60s pour une marque de mode, 16:9 YouTube, palette noir et or"></textarea>

        <!-- Exemples rapides -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px">
          ${[
            ['🎵 Clip Hip-Hop', 'Clip hip-hop 3 minutes, style sombre et cinématique, rappeur en rue la nuit, angles dramatiques, format YouTube 16:9'],
            ['📱 Pub Instagram', 'Pub 20 secondes premium pour un salon de massage en Martinique, ambiance tropicale luxe, format 9:16 Instagram stories'],
            ['🌃 Teaser Luxe', 'Teaser luxe 45 secondes pour une marque de mode haut de gamme, palette noir et or, cinématique, YouTube 16:9'],
            ['🔥 Clip Trap', 'Clip trap sombre 2 minutes 30, artiste seul, 2 lieux urbains nuit, style cyberpunk néon, YouTube'],
          ].map(([label, ex]) => `
            <button class="pill pill-accent" style="cursor:pointer;font-size:9px;white-space:nowrap"
                    onclick="document.getElementById('autobuild-prompt').value=${JSON.stringify(ex)}">${label}</button>
          `).join('')}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="autobuild-btn" onclick="ModuleProject.autoBuild()" style="font-size:12px;font-weight:700">
            ⚡ AUTO BUILD
          </button>
          <button class="btn btn-ghost btn-sm" onclick="ModuleProject.improvePrompt()" style="font-size:11px">
            ✦ Améliorer mon prompt
          </button>
        </div>

        <div id="autobuild-progress" style="display:none;margin-top:12px">
          <div class="shot-progress"><div class="shot-progress-bar" id="ab-prog-bar" style="width:0%"></div></div>
          <div class="text-muted text-small" id="ab-prog-status" style="margin-top:4px">Analyse en cours...</div>
        </div>
      </div>

      <!-- BLUEPRINT RÉSULTAT -->
      ${p.intent ? ModuleProject._renderBlueprint(p.intent) : ''}

      <div class="module-header" style="margin-top:28px">
        <div class="module-title">Projet <span>${escHtml(p.name)}</span></div>
        <div class="module-desc">Paramètres manuels — remplis automatiquement par Auto Build ou configurables à la main.</div>
      </div>

      <!-- ── INFORMATIONS ── -->
      <div class="card">
        <div class="card-title">Informations</div>
        <div class="field">
          <label>Nom du projet</label>
          <input type="text" id="proj-name" value="${escHtml(p.name)}" placeholder="Mon clip..." />
        </div>
        <div class="field">
          <label>Description / concept</label>
          <textarea id="proj-desc" rows="3" placeholder="Concept visuel, thème, mood...">${escHtml(p.description || '')}</textarea>
        </div>
        <div class="field-row">
          <div class="field">
            <label>BPM</label>
            <input type="number" id="proj-bpm" value="${p.bpm || ''}" placeholder="95" min="40" max="220" />
          </div>
          <div class="field">
            <label>Durée cible</label>
            <input type="text" id="proj-duration" value="${escHtml(p.duration || '')}" placeholder="3:30" />
          </div>
        </div>
      </div>

      <!-- ── PISTE MUSICALE ── -->
      <div class="card">
        <div class="card-title">Piste Musicale</div>
        <div class="module-desc" style="margin-bottom:14px">
          Uploadez votre MP3 — le BPM est détecté automatiquement et calibre les durées de shot selon le Document Fondation.
        </div>

        ${track ? `
          <!-- Track chargée -->
          <div style="background:var(--bg-0);border:1px solid var(--accent-border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:40px;height:40px;background:var(--accent-dim);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">♫</div>
              <div style="flex:1;overflow:hidden">
                <div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--text-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(track.name)}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                  ${track.duration ? ModuleProject._formatDuration(track.duration) : '—'}
                  ${track.bpm ? ` · <span style="color:var(--accent);font-weight:700">${track.bpm} BPM</span>` : ''}
                  ${track.size ? ` · ${(track.size / 1024 / 1024).toFixed(1)} MB` : ''}
                </div>
              </div>
              <button onclick="ModuleProject.clearTrack()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--danger);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;flex-shrink:0">✕ Retirer</button>
            </div>
            ${track.base64 ? `
              <audio controls src="${track.base64}" style="width:100%;height:36px;border-radius:6px"></audio>
            ` : ''}
            ${track.bpm ? `
              <div style="background:var(--accent-dim);border:1px solid var(--accent-border);border-radius:6px;padding:10px;font-size:11px;color:var(--text-1)">
                ◈ Beat = <strong style="color:var(--accent)">${(60 / track.bpm).toFixed(3)}s</strong>
                &nbsp;|&nbsp; Shots par minute = <strong style="color:var(--accent)">${PromptEngine.getShotsPerMinute(track.bpm, p.genre)}</strong>
                &nbsp;|&nbsp; Durée shot moyenne = <strong style="color:var(--accent)">${PromptEngine.getAvgShotDuration(track.bpm, p.genre)}s</strong>
              </div>
            ` : `
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-2)">BPM non détecté — saisissez manuellement :</span>
                <input type="number" id="manual-bpm" placeholder="95" min="40" max="220" style="width:80px;background:var(--bg-2);border:1px solid var(--border);color:var(--text-0);padding:6px 10px;border-radius:6px;font-size:12px" onchange="ModuleProject.setManualBPM(this.value)" />
              </div>
            `}
          </div>
        ` : `
          <!-- Zone de drop MP3 -->
          <div id="mp3-drop-zone"
            style="border:2px dashed var(--border);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:all 0.2s"
            ondragover="event.preventDefault();this.style.borderColor='var(--accent)';this.style.background='var(--accent-glow)'"
            ondragleave="this.style.borderColor='var(--border)';this.style.background=''"
            ondrop="ModuleProject.onDrop(event)"
            onclick="document.getElementById('mp3-input').click()">
            <div style="font-size:32px;margin-bottom:8px">♫</div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:4px">Glissez votre MP3 ici</div>
            <div style="font-size:11px;color:var(--text-3)">ou cliquez pour parcourir · MP3, WAV, AAC</div>
          </div>
          <input type="file" id="mp3-input" accept="audio/*" style="display:none" onchange="ModuleProject.loadTrack(this.files[0])" />
        `}
      </div>

      <!-- ── MODÈLE KLING ── -->
      <div class="card">
        <div class="card-title">Modèle Kling via Replicate</div>
        <div class="module-desc" style="margin-bottom:14px">Choisissez le modèle selon le compromis qualité / coût / vitesse.</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="kling-model-grid">
          ${KlingAPI.MODELS_LIST.map(m => `
            <div class="genre-card ${activeModel === m.key ? 'selected' : ''}"
                 onclick="ModuleProject.selectKlingModel('${m.key}')"
                 style="padding:12px 8px">
              <div class="genre-card-icon">${m.icon}</div>
              <div class="genre-card-name" style="font-size:11px">${m.label}</div>
              <div class="genre-card-tempo" style="font-size:9px;margin-top:4px">${m.desc}</div>
              <div style="margin-top:6px;font-size:9px;font-family:var(--font-mono);color:var(--text-3)">${m.cost}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:10px;padding:10px;background:var(--bg-0);border-radius:6px;font-size:11px;color:var(--text-2)">
          Modèle actif : <strong style="color:var(--accent)">${KlingAPI.MODELS_LIST.find(m => m.key === activeModel)?.label || activeModel}</strong>
          — <span style="color:var(--text-3)">${KlingAPI.MODELS_LIST.find(m => m.key === activeModel)?.modelId || ''}</span>
        </div>
      </div>

      <!-- ── FORMAT / GENRE ── -->
      <div class="card">
        <div class="card-title">Format &amp; Genre</div>

        <!-- Clip musical -->
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);letter-spacing:1px;margin-bottom:6px">CLIP MUSICAL</div>
        <div class="genre-grid" style="margin-bottom:14px">
          ${genres.filter(g => !['pub','court','moyen','long'].includes(g.key)).map(g => `
            <div class="genre-card ${p.genre === g.key ? 'selected' : ''}" onclick="ModuleProject.selectGenre('${g.key}')">
              <div class="genre-card-icon">${g.icon}</div>
              <div class="genre-card-name">${g.label}</div>
              <div class="genre-card-tempo">${g.tempo}</div>
            </div>
          `).join('')}
        </div>

        <!-- Publicité -->
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);letter-spacing:1px;margin-bottom:6px">PUBLICITÉ</div>
        <div class="genre-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:14px">
          ${genres.filter(g => g.key === 'pub').map(g => `
            <div class="genre-card ${p.genre === g.key ? 'selected' : ''}" onclick="ModuleProject.selectGenre('${g.key}')">
              <div class="genre-card-icon">${g.icon}</div>
              <div class="genre-card-name">${g.label}</div>
              <div class="genre-card-tempo">${g.tempo}</div>
            </div>
          `).join('')}
        </div>

        <!-- Film -->
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);letter-spacing:1px;margin-bottom:6px">FILM</div>
        <div class="genre-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">
          ${genres.filter(g => ['court','moyen','long'].includes(g.key)).map(g => `
            <div class="genre-card ${p.genre === g.key ? 'selected' : ''}" onclick="ModuleProject.selectGenre('${g.key}')">
              <div class="genre-card-icon">${g.icon}</div>
              <div class="genre-card-name">${g.label}</div>
              <div class="genre-card-tempo">${g.tempo}</div>
            </div>
          `).join('')}
        </div>

        ${playbook ? `
          <div class="rules-box" id="playbook-preview">
            <div class="rules-box-title">◈ PLAYBOOK ACTIF — ${playbook.label.toUpperCase()}</div>
            <div class="rule-row"><span class="rule-key">Durée plan</span><span class="rule-val">${playbook.shotDuration}</span></div>
            <div class="rule-row"><span class="rule-key">Couper sur</span><span class="rule-val rule-good">${playbook.cutTrigger}</span></div>
            <div class="rule-row"><span class="rule-key">Ralentir sur</span><span class="rule-val">${playbook.slowDown}</span></div>
            <div class="rule-row"><span class="rule-key">Raccords efficaces</span><span class="rule-val">${playbook.transitions}</span></div>
            ${playbook.structure3 ? `<div class="rule-row"><span class="rule-key">Structure</span><span class="rule-val" style="font-size:9px">${escHtml(playbook.structure3)}</span></div>` : ''}
            <div class="rule-row"><span class="rule-key text-accent">⚠ Danger</span><span class="rule-val rule-bad">${playbook.danger}</span></div>
            <div class="rule-row"><span class="rule-key">Style Kling</span><span class="rule-val text-mono" style="font-size:10px">${playbook.klingStyle.substring(0, 80)}…</span></div>
          </div>
        ` : '<div class="rules-box" style="text-align:center;color:var(--text-3)">Sélectionnez un format pour voir le playbook</div>'}
      </div>

      <!-- ── RÈGLE MAÎTRE ── -->
      <div class="card">
        <div class="card-title">Règle Maître — Document Fondation 2026</div>
        <div style="background:var(--bg-0);border:1px solid var(--accent-border);border-radius:8px;padding:16px;font-family:var(--font-mono);font-size:11px;color:var(--text-1);line-height:1.8">
          ${PromptEngine.MASTER_RULE}
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="ModuleProject.save()">✓ Sauvegarder</button>
        <button class="btn btn-ghost" onclick="App.goTo('cref')">→ Personnages</button>
      </div>
    `;
  },

  // ── AUTO BUILD ──────────────────────────────────────────────────────

  async autoBuild() {
    const prompt = document.getElementById('autobuild-prompt')?.value.trim();
    if (!prompt) { Toast.error('Décris ce que tu veux produire'); return; }

    const btn     = document.getElementById('autobuild-btn');
    const progDiv = document.getElementById('autobuild-progress');
    const progBar = document.getElementById('ab-prog-bar');
    const progSt  = document.getElementById('ab-prog-status');

    if (btn) btn.disabled = true;
    if (progDiv) progDiv.style.display = 'block';

    const steps = [
      [15,  'Analyse de l\'intention...'],
      [35,  'Détection du format et du genre...'],
      [55,  'Génération de la structure narrative...'],
      [75,  'Définition des personnages et lieux...'],
      [90,  'Contrôle qualité et optimisation...'],
      [100, 'Blueprint prêt ✓'],
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        const [pct, label] = steps[stepIdx++];
        if (progBar) progBar.style.width = pct + '%';
        if (progSt)  progSt.textContent  = label;
      }
    }, 400);

    try {
      const blueprint = await AutoBuildEngine.parse(prompt);

      clearInterval(stepTimer);
      if (progBar) progBar.style.width = '100%';
      if (progSt)  progSt.textContent  = 'Blueprint appliqué ✓';

      AutoBuildEngine.apply(blueprint);

      Toast.success(`✦ Blueprint généré — ${blueprint.characters?.length || 0} personnage(s), ${blueprint.locations?.length || 0} lieu(x), ${blueprint.scriptSections?.length || 0} sections`);

      setTimeout(() => {
        if (btn)     btn.disabled = false;
        if (progDiv) progDiv.style.display = 'none';
        this.render();
        App.updateBadges();
        App.updateSidebarStats();
      }, 800);

    } catch (e) {
      clearInterval(stepTimer);
      if (btn)     btn.disabled = false;
      if (progDiv) progDiv.style.display = 'none';
      Toast.error('Auto Build : ' + e.message);
    }
  },

  async improvePrompt() {
    const el = document.getElementById('autobuild-prompt');
    const prompt = el?.value.trim();
    if (!prompt) { Toast.error('Entre d\'abord un prompt à améliorer'); return; }

    const cfg = State.getConfig();
    if (!cfg.claudeApiKey) {
      Toast.info('Clé Claude nécessaire pour améliorer le prompt — amélioration locale appliquée');
      el.value = `${prompt}, style cinématique professionnel, haute qualité, éclairage dramatique, composition soignée`;
      return;
    }

    Toast.info('Amélioration du prompt...');
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': cfg.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Tu es un directeur artistique expert en production vidéo IA.
Améliore ce prompt de production vidéo en le rendant plus précis, plus riche visuellement et plus exploitable pour un pipeline IA.
Garde le sens original mais enrichis avec : format précis, style visuel, ambiance, palette, mouvement caméra, qualité technique.
Réponds UNIQUEMENT avec le prompt amélioré, sans explication.

Prompt original : "${prompt}"`,
          }],
        }),
      });
      const data = await resp.json();
      const improved = data.content?.[0]?.text?.trim();
      if (improved && el) {
        el.value = improved;
        Toast.success('Prompt amélioré ✓');
      }
    } catch (e) {
      Toast.error('Amélioration échouée : ' + e.message);
    }
  },

  _renderBlueprint(bp) {
    if (!bp) return '';
    const qaColor = bp.qaScore >= 80 ? '#22c55e' : bp.qaScore >= 60 ? 'var(--warning)' : 'var(--danger)';

    return `
      <div class="card" style="border-color:rgba(34,197,94,0.3);background:var(--bg-1)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--text-0)">
            BLUEPRINT GÉNÉRÉ
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-family:var(--font-mono);font-size:10px;color:${qaColor}">
              QA ${bp.qaScore}/100
            </div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);background:var(--bg-3);padding:2px 8px;border-radius:10px">
              ${bp.budgetEstimate || ''}
            </div>
            <button class="btn-del-media" style="font-size:9px"
                    onclick="State.updateProject({intent:null});ModuleProject.render()">✕</button>
          </div>
        </div>

        <!-- Intention + Paramètres -->
        <div style="background:var(--bg-3);border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-0);font-style:italic;margin-bottom:8px">"${escHtml(bp.intent || '')}"</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[
              [`${bp.deliverable?.toUpperCase() || ''}`, '#818cf8'],
              [bp.aspectRatio, 'var(--accent)'],
              [bp.platform,    'var(--text-2)'],
              [bp.genre?.toUpperCase(), 'var(--text-2)'],
              [bp.duration > 0 ? Math.floor(bp.duration/60) + 'min' + (bp.duration%60>0 ? (bp.duration%60)+'s' : '') : '', 'var(--text-3)'],
              [bp.bpm > 0 ? bp.bpm + ' BPM' : '', 'var(--text-3)'],
            ].filter(([v]) => v).map(([val, color]) => `
              <span style="font-family:var(--font-mono);font-size:9px;color:${color};background:var(--bg-2);padding:2px 8px;border-radius:10px">${escHtml(val)}</span>
            `).join('')}
          </div>
          <div style="font-size:10px;color:var(--text-3);margin-top:6px">${escHtml(bp.style || '')}</div>
        </div>

        <!-- Structure script -->
        ${(bp.scriptSections || []).length > 0 ? `
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">STRUCTURE — ${bp.scriptSections.length} sections · ${bp.shotCount} shots</div>
            <div style="display:flex;gap:4px;height:28px;border-radius:6px;overflow:hidden">
              ${bp.scriptSections.map((s, i) => {
                const colors = { intro:'#6366f1', verse:'var(--accent)', chorus:'#22c55e', bridge:'#f59e0b', outro:'#64748b', sequence:'#818cf8' };
                const pct = Math.round((s.duration || 20) / (bp.duration || 180) * 100);
                return `<div style="flex:${pct};background:${colors[s.type] || '#64748b'};display:flex;align-items:center;justify-content:center;font-size:7px;font-family:var(--font-mono);color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;padding:0 4px" title="${escHtml(s.label)}: ${escHtml(s.content || '')}">${pct >= 10 ? escHtml(s.label) : ''}</div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Assets -->
        <div style="display:flex;gap:8px;margin-bottom:12px">
          ${(bp.characters || []).length > 0 ? `
            <div style="flex:1;background:var(--bg-3);border-radius:6px;padding:8px">
              <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);margin-bottom:6px">PERSONNAGES</div>
              ${bp.characters.map(c => `
                <div style="font-size:10px;color:var(--text-1);margin-bottom:2px">◉ ${escHtml(c.name)}</div>
              `).join('')}
            </div>
          ` : ''}
          ${(bp.locations || []).length > 0 ? `
            <div style="flex:1;background:var(--bg-3);border-radius:6px;padding:8px">
              <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);margin-bottom:6px">LIEUX</div>
              ${bp.locations.map(l => `
                <div style="font-size:10px;color:var(--text-1);margin-bottom:2px">◫ ${escHtml(l.name)}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Hypothèses -->
        ${(bp.hypotheses || []).length > 0 ? `
          <div style="margin-bottom:10px">
            <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">HYPOTHÈSES APPLIQUÉES</div>
            ${bp.hypotheses.map(h => `
              <div style="font-size:10px;color:var(--text-2);padding:2px 0;line-height:1.4">◈ ${escHtml(h)}</div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Risques -->
        ${(bp.risks || []).length > 0 ? `
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-family:var(--font-mono);color:var(--warning);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⚠ RISQUES DÉTECTÉS</div>
            ${bp.risks.map(r => `
              <div style="font-size:10px;color:var(--warning);padding:2px 0;line-height:1.4">⚠ ${escHtml(r)}</div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Générer assets automatiquement -->
        <div style="border-top:1px solid var(--border-1);padding-top:12px;margin-bottom:10px">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:8px;font-family:var(--font-mono)">GÉNÉRATION AUTOMATIQUE DES ASSETS</div>
          <button class="btn btn-primary" id="btn-gen-assets" onclick="ModuleProject.generateBlueprintAssets()"
                  style="width:100%;font-size:12px;font-weight:700;letter-spacing:0.05em">
            ⚡ GÉNÉRER PERSONNAGES + LIEUX
          </button>
          <div id="assets-gen-progress" style="display:none;margin-top:10px"></div>
        </div>

        <!-- Navigation pipeline -->
        <div style="border-top:1px solid var(--border-1);padding-top:12px">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:8px;font-family:var(--font-mono)">PIPELINE</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="App.goTo('script')">→ Script</button>
            <button class="btn btn-ghost btn-sm" onclick="App.goTo('cref')">→ Personnages</button>
            <button class="btn btn-ghost btn-sm" onclick="App.goTo('lref')">→ Lieux</button>
            <button class="btn btn-ghost btn-sm" onclick="ModuleProject.exportProject()">📦 Exporter</button>
            <button class="btn btn-primary btn-sm" onclick="App.goTo('shots')">→ Shots Kling</button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Génération auto des assets depuis le blueprint ───────────────────

  async generateBlueprintAssets() {
    const p = State.currentProject();
    if (!p) return;
    const bp = p.intent;
    if (!bp) { Toast.error('Lance d\'abord un Auto Build'); return; }

    const btn = document.getElementById('btn-gen-assets');
    const progressEl = document.getElementById('assets-gen-progress');
    if (btn) btn.disabled = true;
    if (progressEl) progressEl.style.display = 'block';

    const chars = p.characters || [];
    const locs  = p.locations  || [];
    const total  = chars.length + locs.length;
    let done = 0;

    const updateProgress = (label) => {
      if (!progressEl) return;
      const pct = Math.round((done / Math.max(1, total)) * 100);
      progressEl.innerHTML = `
        <div style="font-size:10px;color:var(--text-2);font-family:var(--font-mono);margin-bottom:4px">${escHtml(label)}</div>
        <div style="height:4px;background:var(--bg-3);border-radius:2px;overflow:hidden">
          <div style="height:100%;background:var(--accent);border-radius:2px;width:${pct}%;transition:width 0.4s"></div>
        </div>
        <div style="font-size:9px;color:var(--text-3);margin-top:3px">${done}/${total} assets</div>
      `;
    };

    updateProgress('Démarrage...');

    // Générer les personnages
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c.generatedBase) { done++; updateProgress(`Personnage déjà généré : ${c.name}`); continue; }
      updateProgress(`Génération : ${c.name}...`);
      try {
        const desc = c.description || c.name;
        const prompt = `${desc}, portrait, photorealistic, professional photography, sharp focus, studio lighting`;
        const imageUrl = await NanoBananaAPI.generateAndWait(
          { prompt, imageInputs: [], aspectRatio: '2:3', resolution: '1K' },
          (pct) => updateProgress(`${c.name} — ${pct}%`)
        );
        State.updateCharacter(c.id, { generatedBase: imageUrl, locked: true });
        done++;
        updateProgress(`✅ ${c.name} généré`);
      } catch (e) {
        console.error('Asset gen error (char):', e);
        Toast.error(`Erreur ${c.name}: ${e.message?.substring(0, 40)}`);
        done++;
      }
    }

    // Générer les lieux
    for (let i = 0; i < locs.length; i++) {
      const l = locs[i];
      if (l.imageUrl) { done++; updateProgress(`Lieu déjà généré : ${l.name}`); continue; }
      updateProgress(`Génération lieu : ${l.name}...`);
      try {
        const desc = l.promptDesc || l.description || l.name;
        const mood = l.mood ? `, ${l.mood}` : '';
        const prompt = `${desc}${mood}, photorealistic, cinematic, professional photography, sharp focus, dramatic lighting`;
        const p2 = State.currentProject();
        const aspectRatio = p2?.aspectRatio || '16:9';
        const imageUrl = await NanoBananaAPI.generateAndWait(
          { prompt, imageInputs: [], aspectRatio, resolution: '1K' },
          (pct) => updateProgress(`${l.name} — ${pct}%`)
        );
        State.updateLocation(l.id, { imageUrl, locked: true });
        done++;
        updateProgress(`✅ ${l.name} généré`);
      } catch (e) {
        console.error('Asset gen error (loc):', e);
        Toast.error(`Erreur ${l.name}: ${e.message?.substring(0, 40)}`);
        done++;
      }
    }

    if (progressEl) {
      progressEl.innerHTML = `
        <div style="font-size:11px;color:#22c55e;font-family:var(--font-mono)">✅ ${done}/${total} assets générés et verrouillés — prêt pour Kling 3</div>
      `;
    }
    if (btn) btn.disabled = false;
    App.updateBadges();
    App.updateSidebarStats();
    Toast.success(`${done} assets générés et verrouillés`);
  },

  // ── Export dossier de production ─────────────────────────────────────

  exportProject() {
    const p = State.currentProject();
    if (!p) return;
    const bp = p.intent || {};

    const lines = [
      `╔══════════════════════════════════════════════════`,
      `║  DOSSIER DE PRODUCTION — ${(p.name || '').toUpperCase()}`,
      `║  Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      `╚══════════════════════════════════════════════════`,
      ``,
      `■ BRIEF`,
      `  Intention  : ${bp.intent || p.description || ''}`,
      `  Genre      : ${p.genre || ''}`,
      `  BPM        : ${p.bpm || ''}`,
      `  Format     : ${p.aspectRatio || '16:9'} — ${p.platform || ''}`,
      `  Durée      : ${p.duration || ''}`,
      `  Style      : ${p.style || ''}`,
      `  Palette    : ${p.colorPalette || ''}`,
      `  Caméra     : ${p.cameraLanguage || ''}`,
      `  Ton        : ${p.tone || ''}`,
      ``,
      `■ PERSONNAGES (${(p.characters || []).length})`,
      ...(p.characters || []).map(c =>
        `  [${c.locked ? '✓' : ' '}] ${c.name}${c.description ? ' — ' + c.description : ''}`
      ),
      ``,
      `■ LIEUX (${(p.locations || []).length})`,
      ...(p.locations || []).map(l =>
        `  [${l.locked ? '✓' : ' '}] ${l.name}${l.mood ? ' — ' + l.mood : ''}`
      ),
      ``,
      `■ OBJETS / PROPS (${(p.objects || []).length})`,
      ...(p.objects || []).map(o =>
        `  [${o.locked ? '✓' : ' '}] ${o.name}${o.description ? ' — ' + o.description : ''}`
      ),
      ``,
      `■ SCRIPT — ${(p.scriptSections || []).length} sections`,
      ...(p.scriptSections || []).flatMap(s => [
        ``,
        `  [${s.label || s.type}]`,
        `  ${s.content || '(vide)'}`,
      ]),
      ``,
      `■ SHOTS (${(p.rushes || []).length} rushes)`,
      ...(p.rushes || []).map(r =>
        `  [${r.status}] ${r.name} — ${r.shots?.length || 0} shots${r.validated ? ' ✓ validé' : ''}`
      ),
      ``,
      `■ QA`,
      `  Score      : ${bp.qaScore || '—'}/100`,
      `  Budget est.: ${bp.budgetEstimate || '—'}`,
      bp.hypotheses?.length ? `  Hypothèses : ${bp.hypotheses.join(' | ')}` : '',
      bp.risks?.length ? `  Risques    : ${bp.risks.join(' | ')}` : '',
    ].filter(l => l !== null && l !== undefined);

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(p.name || 'production').replace(/\s+/g, '_')}_dossier.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Dossier exporté');
  },

  // ── Actions genre / modèle ──
  selectGenre(key) {
    State.updateProject({ genre: key });
    this.render();
    App.updateBadges();
  },

  selectKlingModel(key) {
    State.updateProject({ klingModel: key });
    this.render();
    Toast.success(`Modèle Kling : ${KlingAPI.MODELS_LIST.find(m => m.key === key)?.label}`);
  },

  save() {
    const bpmVal = parseInt(document.getElementById('proj-bpm')?.value) || null;
    State.updateProject({
      name:     document.getElementById('proj-name').value.trim(),
      description: document.getElementById('proj-desc').value.trim(),
      bpm:      bpmVal,
      duration: document.getElementById('proj-duration').value.trim(),
    });
    // Sync BPM dans musicTrack si saisie manuelle
    const track = State.currentProject().musicTrack;
    if (track && bpmVal && !track.bpm) {
      State.updateProject({ musicTrack: { ...track, bpm: bpmVal } });
    }
    App.refreshProjectList();
    App.updateBadges();
    Toast.success('Projet sauvegardé');
  },

  // ── Gestion piste MP3 ──
  onDrop(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = 'var(--border)';
    event.currentTarget.style.background = '';
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      this.loadTrack(file);
    } else {
      Toast.error('Fichier audio invalide (MP3, WAV, AAC attendu)');
    }
  },

  async loadTrack(file) {
    if (!file) return;
    Toast.info('Analyse de la piste...');

    try {
      const base64 = await Downloader.fileToBase64(file);

      // Durée via AudioContext
      let duration = null;
      let bpm = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        duration = audioBuffer.duration;
        bpm = await ModuleProject._detectBPM(audioBuffer);
        ctx.close();
      } catch (e) {
        console.warn('Analyse audio échouée :', e);
      }

      const track = {
        name:     file.name,
        base64,
        duration,
        bpm,
        size:     file.size,
      };

      State.updateProject({ musicTrack: track });

      // Sync BPM dans le champ projet si absent
      const p = State.currentProject();
      if (bpm && !p.bpm) {
        State.updateProject({ bpm });
      }

      if (bpm) {
        Toast.success(`♫ Piste chargée · ${bpm} BPM détectés`);
      } else {
        Toast.success('♫ Piste chargée — BPM non détecté, saisissez-le manuellement');
      }

      this.render();
      App.updateBadges();
    } catch (e) {
      Toast.error('Erreur chargement piste : ' + e.message);
    }
  },

  clearTrack() {
    State.updateProject({ musicTrack: null });
    this.render();
    Toast.info('Piste musicale retirée');
  },

  setManualBPM(val) {
    const bpm = parseInt(val);
    if (!bpm || bpm < 40 || bpm > 220) return;
    const track = State.currentProject().musicTrack;
    if (track) {
      State.updateProject({ musicTrack: { ...track, bpm }, bpm });
    } else {
      State.updateProject({ bpm });
    }
    this.render();
  },

  _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  /**
   * Détection BPM par analyse d'enveloppe d'amplitude.
   * Précision ±3 BPM pour la plupart des genres.
   */
  async _detectBPM(audioBuffer) {
    try {
      const sampleRate = audioBuffer.sampleRate;
      const raw = audioBuffer.getChannelData(0);

      // Analyse sur 90s max pour éviter les timeouts
      const maxSamples = sampleRate * 90;
      const data = raw.length > maxSamples ? raw.slice(0, maxSamples) : raw;

      // Downsample à ~3000 Hz (on garde 1 sample sur N)
      const targetRate = 3000;
      const step = Math.max(1, Math.floor(sampleRate / targetRate));
      const ds = [];
      for (let i = 0; i < data.length; i += step) {
        ds.push(Math.abs(data[i]));
      }
      const dsRate = sampleRate / step;

      // Filtrage passe-bas (moyenne glissante 20ms → lissage de l'enveloppe)
      const winSize = Math.round(dsRate * 0.02);
      const env = new Float32Array(ds.length);
      let runSum = 0;
      for (let i = 0; i < ds.length; i++) {
        runSum += ds[i];
        if (i >= winSize) runSum -= ds[i - winSize];
        env[i] = runSum / Math.min(winSize, i + 1);
      }

      // Différence d'énergie (onset detection)
      const diff = new Float32Array(ds.length);
      for (let i = 1; i < ds.length; i++) {
        diff[i] = Math.max(0, ds[i] - env[i]);
      }

      // Trouver les pics (intervalle min = 250ms)
      const minInterval = Math.round(dsRate * 0.25);
      const threshold = (Math.max(...diff) * 0.35);
      const peaks = [];
      let lastPeak = -minInterval;
      for (let i = 1; i < diff.length - 1; i++) {
        if (diff[i] > threshold && diff[i] >= diff[i - 1] && diff[i] >= diff[i + 1] && (i - lastPeak) >= minInterval) {
          peaks.push(i);
          lastPeak = i;
        }
      }

      if (peaks.length < 6) return null;

      // Intervalles entre pics
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
      }

      // Médiane des intervalles (robuste aux valeurs aberrantes)
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Conversion en BPM
      let bpm = Math.round((dsRate / median) * 60);

      // Normalisation dans la plage 60–180 BPM
      while (bpm < 60)  bpm *= 2;
      while (bpm > 180) bpm /= 2;
      bpm = Math.round(bpm);

      // Sanity check
      if (bpm < 50 || bpm > 200) return null;

      return bpm;
    } catch (e) {
      console.warn('_detectBPM error:', e);
      return null;
    }
  },
};
