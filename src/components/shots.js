/**
 * SUPER PIPE — SHOTS KLING 3
 * Chaîne de fabrication automatisée : Script → Claude → Prompts → Kling 3 → Rushes
 *
 * WORKFLOW :
 *  1. Le script est découpé en sections (intro/couplet/refrain…)
 *  2. Pour chaque section : Claude génère les prompts Kling 3 ultra-structurés
 *     basés sur genre, BPM, visuels verrouillés et Document Fondation
 *  3. Les shots sont packés en rushes (max 6 shots, max 15s, min 3s/shot)
 *  4. La file d'attente envoie les rushes à Kling 3 un par un, en auto
 *  5. Les rushes générés sont validables et partent dans Montage → Shotstack
 *
 * Rush status : 'pending' | 'prompting' | 'queued' | 'generating' | 'done' | 'error'
 */

const ModuleShots = {

  _queueRunning: false,
  _queueAborted: false,

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-shots');

    const rushes      = p.rushes || [];
    const done        = rushes.filter(r => r.status === 'done' || r.videoUrl).length;
    const validated   = rushes.filter(r => r.validated).length;
    const inProgress  = rushes.filter(r => r.status === 'generating' || r.status === 'prompting').length;
    const pending     = rushes.filter(r => r.status === 'pending' || r.status === 'queued').length;
    const sections    = p.scriptSections || [];
    const { tags }    = KlingAPI.buildReferenceImages(p);
    const hasRefs     = tags.chars.length + tags.locs.length > 0;

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Shots <span>Kling 3 Pipeline</span></div>
        <div class="module-desc">
          Claude génère les prompts vidéo ultra-structurés selon le Document Fondation, le genre, le BPM et tes visuels verrouillés.
          Kling 3 génère les rushes automatiquement en file d'attente.
        </div>
      </div>

      ${!KlingAPI.isConfigured() ? `
        <div class="alert-box alert-warn">⚠ Clé API Replicate manquante — entrez <code>MOCK</code> pour tester la pipeline sans coût.</div>
      ` : ''}


      <!-- ── QA CONTROLLER ── -->
      ${this.renderQAController(p, sections, tags)}

      <!-- ── RÉFÉRENCES VISUELLES ── -->
      ${this.renderRefTags(tags)}

      <!-- ── BOUTON LANCER LA PIPE COMPLÈTE ── -->
      ${this.renderPipelineLauncher(p, sections, tags)}

      <!-- ── PIPELINE PAR SECTION ── -->
      ${sections.length === 0 ? `
        <div class="alert-box alert-warn">
          ⚠ Aucun script trouvé — écrivez et parsez le script d'abord.
          <button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="App.goTo('script')">→ Créer le script</button>
        </div>
      ` : this.renderSectionPipeline(p, sections, tags)}

      <!-- ── TABLEAU DE BORD FILE D'ATTENTE ── -->
      ${rushes.length > 0 ? this.renderQueueDashboard(rushes, done, validated, inProgress, pending) : ''}

      <!-- ── RUSHES GÉNÉRÉS + ERREURS ── -->
      ${rushes.filter(r => r.status === 'done' || r.videoUrl || r.status === 'error').length > 0 ? `
        <div style="margin-top:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--text-0)">
              ${done} rush${done > 1 ? 'es' : ''} générés
              <span class="text-muted" style="font-size:12px;font-weight:400;margin-left:8px">${validated} validés</span>
              ${rushes.filter(r => r.status === 'error').length > 0 ? `
                <span style="font-size:12px;color:var(--danger);font-weight:400;margin-left:8px">· ${rushes.filter(r=>r.status==='error').length} erreur(s)</span>
              ` : ''}
            </div>
            ${validated > 0 ? `<button class="btn btn-primary btn-sm" onclick="App.goTo('montage')">→ Montage</button>` : ''}
          </div>
          ${rushes.filter(r => r.status === 'done' || r.videoUrl || r.status === 'error').map((r, i) => this.renderRushCard(r, i)).join('')}
        </div>
      ` : ''}
    `;
  },

  renderPipelineLauncher(p, sections, tags) {
    const hasScript  = sections.length > 0;
    const hasRefs    = tags.chars.length + tags.locs.length + tags.objs.length + (tags.titrages || []).length > 0;
    const hasClaude  = ClaudeAPI.isConfigured();
    const hasKling   = KlingAPI.isConfigured();
    const hasRushes  = (p.rushes || []).length > 0;
    // Seul le script est obligatoire — les refs sont optionnelles (enrichissent les prompts si présentes)
    const allReady   = hasScript;

    // Checklist de statut
    const checks = [
      { ok: hasScript, required: true,  label: 'Script parsé',          count: `${sections.length} section${sections.length !== 1 ? 's' : ''}`,   action: `App.goTo('script')`,   actionLabel: '→ Script' },
      { ok: hasRefs,   required: false, label: 'Références visuelles',  count: hasRefs ? `${tags.chars.length} perso · ${tags.locs.length} lieu · ${tags.objs.length} objet` : 'Optionnel — améliore les prompts', action: `App.goTo('cref')`, actionLabel: '→ Persos' },
      { ok: hasKling,  required: false, label: 'Replicate API',         count: hasKling  ? 'Configurée' : 'MOCK mode (test sans coût)',            action: `App.goTo('settings')`, actionLabel: '→ Config' },
      { ok: hasClaude, required: false, label: 'OpenRouter (optionnel)',count: hasClaude ? 'Configurée — prompts enrichis' : 'Non configurée — moteur interne utilisé', action: `App.goTo('settings')`, actionLabel: '→ Config' },
    ];

    return `
      <div class="card" style="margin-bottom:16px;${allReady ? 'border-color:rgba(201,168,76,0.4)' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <div class="card-title" style="font-size:13px">🚀 LANCER LA PIPE COMPLÈTE</div>
            <div class="text-muted text-small">Script → Claude → Prompts Kling 3 → Génération auto → Tu valides les shots finaux</div>
          </div>
          ${allReady && !this._queueRunning ? `
            <button class="btn btn-primary" style="font-size:13px;padding:10px 20px;font-weight:800"
                    onclick="ModuleShots.generateAllSections()">
              ⚡⚡ TOUT GÉNÉRER
            </button>
          ` : this._queueRunning ? `
            <button class="btn btn-ghost" onclick="ModuleShots.pauseQueue()">⏸ Pause</button>
          ` : `
            <button class="btn btn-ghost" disabled style="opacity:0.4">⚡⚡ TOUT GÉNÉRER</button>
          `}
        </div>

        <!-- Checklist -->
        <div style="display:flex;flex-direction:column;gap:6px">
          ${checks.map(c => `
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:14px;flex-shrink:0">${c.ok ? '✅' : (c.required ? '⭕' : '🔘')}</span>
              <span style="font-size:11px;color:${c.ok ? 'var(--text-1)' : (c.required ? 'var(--text-3)' : 'var(--text-3)')};flex:1">${c.label}</span>
              <span style="font-family:var(--font-mono);font-size:9px;color:${c.ok ? 'var(--accent)' : (c.required ? 'var(--warning)' : 'var(--text-3)')}">${c.count}</span>
              ${!c.ok && c.required ? `<button class="btn btn-ghost btn-sm" style="font-size:9px;padding:2px 8px" onclick="${c.action}">${c.actionLabel}</button>` : ''}
            </div>
          `).join('')}
        </div>

        ${hasRushes ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <span class="text-muted text-small">${(p.rushes||[]).length} rush${(p.rushes||[]).length > 1 ? 'es' : ''} en file · ${(p.rushes||[]).filter(r=>r.validated).length} validés</span>
            <button class="btn btn-ghost btn-sm" style="margin-left:10px;font-size:9px" onclick="ModuleShots.clearAllRushes()">🗑 Tout effacer</button>
          </div>
        ` : ''}
      </div>`;
  },

  renderQAController(p, sections, tags) {
    const bp = p.intent || {};
    const qaScore = bp.qaScore || 0;
    const qaColor = qaScore >= 80 ? '#22c55e' : qaScore >= 60 ? 'var(--warning)' : 'var(--danger)';

    const sectionsWithContent = sections.filter(s => s.content?.trim()).length;
    const lockedChars = (p.characters || []).filter(c => c.locked && c.generatedBase).length;
    const lockedLocs  = (p.locations  || []).filter(l => l.locked && l.imageUrl).length;
    const lockedObjs  = (p.objects    || []).filter(o => o.locked && o.imageUrl).length;

    const checks = [
      { ok: sections.length > 0,         label: 'Script parsé',             count: `${sections.length} sections` },
      { ok: sectionsWithContent === sections.length && sections.length > 0,
                                          label: 'Sections avec contenu',    count: `${sectionsWithContent}/${sections.length}` },
      { ok: lockedChars > 0,             label: 'Personnages générés+lock', count: `${lockedChars} verrouillé(s)` },
      { ok: lockedLocs > 0,              label: 'Lieux générés+lock',       count: `${lockedLocs} verrouillé(s)` },
      { ok: ClaudeAPI.isConfigured(),    label: 'OpenRouter API',           count: ClaudeAPI.isConfigured() ? 'Configurée' : 'Mode interne' },
      { ok: KlingAPI.isConfigured(),     label: 'Replicate API',            count: KlingAPI.isConfigured() ? 'Configurée' : 'MOCK mode' },
    ];

    const readyCount = checks.filter(c => c.ok).length;
    const readyPct   = Math.round((readyCount / checks.length) * 100);

    const warnings = [];
    if (!sections.some(s => s.content?.trim())) warnings.push('Les sections du script sont vides — ajoute du contenu pour des prompts Kling plus précis');
    if (lockedChars === 0 && (p.characters || []).length > 0) warnings.push('Des personnages existent mais ne sont pas générés/verrouillés — utilise Auto Build → Générer assets');
    if (lockedLocs === 0 && (p.locations || []).length > 0) warnings.push('Des lieux existent mais ne sont pas générés/verrouillés — utilise Auto Build → Générer assets');

    return `
      <div class="card" style="margin-bottom:16px;border-color:${readyPct >= 80 ? 'rgba(34,197,94,0.3)' : readyPct >= 50 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title" style="margin:0;font-size:12px">🎯 CONTRÔLEUR QA PIPELINE</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${qaScore > 0 ? `<span style="font-family:var(--font-mono);font-size:10px;color:${qaColor}">QA ${qaScore}/100</span>` : ''}
            <span style="font-family:var(--font-mono);font-size:10px;color:${readyPct >= 80 ? '#22c55e' : 'var(--warning)'}">PRÊT ${readyPct}%</span>
          </div>
        </div>

        <!-- Jauge globale -->
        <div style="height:4px;background:var(--bg-3);border-radius:2px;overflow:hidden;margin-bottom:12px">
          <div style="height:100%;background:${readyPct >= 80 ? '#22c55e' : readyPct >= 50 ? 'var(--warning)' : 'var(--danger)'};border-radius:2px;width:${readyPct}%;transition:width 0.5s"></div>
        </div>

        <!-- Checklist -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:${warnings.length > 0 ? '12px' : '0'}">
          ${checks.map(c => `
            <div style="background:var(--bg-3);border-radius:6px;padding:6px 8px;display:flex;align-items:center;gap:6px">
              <span style="font-size:10px">${c.ok ? '✅' : '🔘'}</span>
              <div>
                <div style="font-size:9px;font-family:var(--font-mono);color:${c.ok ? 'var(--text-1)' : 'var(--text-3)'}">${c.label}</div>
                <div style="font-size:8px;font-family:var(--font-mono);color:${c.ok ? 'var(--accent)' : 'var(--text-3)'}">${c.count}</div>
              </div>
            </div>
          `).join('')}
        </div>

        ${warnings.length > 0 ? `
          <div style="border-top:1px solid var(--border);padding-top:10px">
            ${warnings.map(w => `
              <div style="font-size:10px;color:var(--warning);line-height:1.4;margin-bottom:4px">⚠ ${escHtml(w)}</div>
            `).join('')}
          </div>
        ` : ''}

        ${(bp.hypotheses || []).length > 0 ? `
          <details style="margin-top:8px">
            <summary style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);cursor:pointer;letter-spacing:1px">HYPOTHÈSES AUTO BUILD (${bp.hypotheses.length})</summary>
            <div style="margin-top:6px;padding:8px;background:var(--bg-3);border-radius:6px">
              ${bp.hypotheses.map(h => `<div style="font-size:9px;color:var(--text-2);line-height:1.5">◈ ${escHtml(h)}</div>`).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `;
  },

  renderRefTags(tags) {
    const p = State.currentProject();

    // Construire les vignettes avec images réelles
    const buildThumb = (imgSrc, tag, name, icon) => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;flex-shrink:0">
        <div style="position:relative;width:56px;height:56px;border-radius:8px;overflow:hidden;border:1px solid var(--accent-border)">
          ${imgSrc
            ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover" />`
            : `<div style="width:100%;height:100%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:18px">${icon}</div>`
          }
          <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);text-align:center;font-family:var(--font-mono);font-size:7px;color:var(--accent);padding:2px 0;font-weight:700">
            ${escHtml(tag)}
          </div>
        </div>
        <div style="font-size:8px;color:var(--text-2);text-align:center;line-height:1.2;max-width:64px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(name)}</div>
      </div>`;

    const thumbs = [];

    // Personnages
    tags.chars.forEach(t => {
      const c   = (p.characters || []).find(c => c.locked && c.name === t.name);
      const tenue = c ? (c.tenues || []).find(x => x.locked && x.imageUrl) : null;
      const src = tenue?.imageUrl || c?.base64 || c?.generatedBase || null;
      thumbs.push(buildThumb(src, t.tag, t.name, '◉'));
    });

    // Lieux
    tags.locs.forEach(t => {
      const l   = (p.locations || []).find(l => l.locked && l.name === t.name);
      const angle = l ? (l.angles || []).find(a => a.locked && a.imageUrl) : null;
      const src = angle?.imageUrl || l?.imageUrl || l?.base64 || null;
      thumbs.push(buildThumb(src, t.tag, t.name, '◫'));
    });

    // Objets
    tags.objs.forEach(t => {
      const o   = (p.objects || []).find(o => o.locked && o.name === t.name);
      thumbs.push(buildThumb(o?.imageUrl || null, t.tag, t.name, '◧'));
    });

    // Titrages : plans autonomes, pas des références visuelles injectées ici

    if (thumbs.length === 0) return `
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span style="font-size:18px">🔘</span>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text-2)">Aucune référence visuelle — la génération fonctionnera sans images de référence.</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:2px">Optionnel : verrouillez personnages / lieux / objets pour des résultats plus cohérents.</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" style="font-size:9px" onclick="App.goTo('cref')">Personnages</button>
          <button class="btn btn-ghost btn-sm" style="font-size:9px" onclick="App.goTo('lref')">Lieux</button>
        </div>
      </div>`;

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="font-size:10px;margin-bottom:12px">◈ RÉFÉRENCES VISUELLES INJECTÉES — ${thumbs.length} élément${thumbs.length > 1 ? 's' : ''}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${thumbs.join('')}
        </div>
      </div>`;
  },

  renderSectionPipeline(p, sections, tags) {
    const bpm    = p.musicTrack?.bpm || parseInt(p.bpm) || 95;
    const rushes = p.rushes || [];

    const rows = sections.map((section, i) => {
      const sectionDur = PromptEngine.estimateSectionDuration(p, i);
      const plan       = PromptEngine.planSectionRushes(section, p, sectionDur);
      const sectionTag = `section_${i}`;

      // Statut de cette section dans la queue
      const sectionRushes = rushes.filter(r => r.sectionIndex === i);
      const sDone    = sectionRushes.filter(r => r.status === 'done' || r.videoUrl).length;
      const sGen     = sectionRushes.filter(r => r.status === 'generating' || r.status === 'prompting').length;
      const sPending = sectionRushes.filter(r => r.status === 'pending' || r.status === 'queued').length;

      let statusBadge = '';
      if (sGen > 0)          statusBadge = `<span class="pill" style="background:rgba(245,158,11,0.15);color:var(--warning);border:1px solid rgba(245,158,11,0.3)">🔄 EN COURS</span>`;
      else if (sDone >= plan.rushCount && plan.rushCount > 0)
                             statusBadge = `<span class="pill" style="background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.3)">✓ ${sDone}/${plan.rushCount}</span>`;
      else if (sPending > 0) statusBadge = `<span class="pill" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.3)">⏳ ${sPending} en attente</span>`;
      else                   statusBadge = `<span class="pill" style="background:var(--bg-3);color:var(--text-3);border:1px solid var(--border)">○ ${plan.rushCount} rushes</span>`;

      const sectionLabel = PromptEngine.SECTION_TYPES[section.type]?.label || section.type;

      return `
        <div class="card" style="padding:12px 16px;margin-bottom:8px" id="section-card-${i}">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);letter-spacing:1px;min-width:90px;flex-shrink:0">
              ${sectionLabel.toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${escHtml((section.content || '').substring(0, 60))}${(section.content || '').length > 60 ? '…' : ''}
              </div>
              <div class="text-muted" style="font-size:9px;margin-top:2px;font-family:var(--font-mono)">
                ~${plan.rushCount} rushes · ~${plan.shotCount} shots · ${plan.avgShotDur}s/shot · ~${Math.round(sectionDur)}s section
              </div>
            </div>
            ${statusBadge}
            <button class="btn btn-primary btn-sm" style="flex-shrink:0"
                    onclick="ModuleShots.generateSection(${i})"
                    id="btn-gen-section-${i}">
              ⚡ Générer
            </button>
            <div id="section-progress-${i}" style="display:none;flex-basis:100%;margin-top:8px">
              <div class="shot-progress"><div class="shot-progress-bar" id="section-prog-bar-${i}" style="width:10%"></div></div>
              <div class="text-muted text-small" id="section-prog-label-${i}">Claude génère les prompts…</div>
            </div>
          </div>
        </div>
      `;
    });

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title">PIPELINE PAR SECTION — ${sections.length} sections</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${this._queueRunning ? `
              <button class="btn btn-ghost btn-sm" onclick="ModuleShots.pauseQueue()">⏸ Pause</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="ModuleShots.generateAllSections()">⚡⚡ TOUT GÉNÉRER</button>
            `}
          </div>
        </div>
        ${rows.join('')}
      </div>
    `;
  },

  renderQueueDashboard(rushes, done, validated, inProgress, pending) {
    const total = rushes.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    const allItems = rushes.slice().reverse(); // plus récents en haut

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title">FILE D'ATTENTE KLING 3</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-2)">
            ${done}/${total} générés · ${validated} validés
          </div>
        </div>

        <!-- Barre de progression globale -->
        <div class="shot-progress" style="margin-bottom:8px">
          <div class="shot-progress-bar" style="width:${pct}%"></div>
        </div>
        <div class="text-muted text-small" style="margin-bottom:12px;font-family:var(--font-mono)">
          ${inProgress > 0 ? `🔄 ${inProgress} en génération` : ''}
          ${pending > 0    ? ` · ⏳ ${pending} en attente` : ''}
          ${done > 0       ? ` · ✅ ${done} terminés` : ''}
        </div>

        <!-- Controls queue -->
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          ${!this._queueRunning && pending > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="ModuleShots.startQueue()">▶ Démarrer la file</button>
          ` : ''}
          ${this._queueRunning ? `
            <button class="btn btn-ghost btn-sm" onclick="ModuleShots.pauseQueue()">⏸ Pause</button>
          ` : ''}
          ${rushes.some(r => r.status === 'error') ? `
            <button class="btn btn-ghost btn-sm" onclick="ModuleShots.retryErrors()">↺ Réessayer les erreurs</button>
          ` : ''}
          ${done > 0 ? `
            <button class="btn btn-ghost btn-sm" onclick="ModuleShots.clearDone()">🗑 Nettoyer terminés</button>
          ` : ''}
        </div>

        <!-- Liste des items -->
        <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:4px" id="queue-list">
          ${allItems.map(r => this.renderQueueItem(r)).join('')}
        </div>
      </div>
    `;
  },

  renderQueueItem(rush) {
    const statusConfig = {
      pending:    { icon: '○',  color: 'var(--text-3)',   bg: 'var(--bg-3)',              label: 'EN ATTENTE' },
      queued:     { icon: '⏳', color: '#818cf8',          bg: 'rgba(99,102,241,0.08)',   label: 'EN FILE' },
      prompting:  { icon: '✦',  color: 'var(--accent)',   bg: 'var(--accent-dim)',        label: 'CLAUDE…' },
      generating: { icon: '◈',  color: 'var(--warning)',  bg: 'rgba(245,158,11,0.08)',   label: 'KLING 3…' },
      done:       { icon: '✓',  color: '#22c55e',          bg: 'rgba(34,197,94,0.08)',    label: 'FAIT' },
      error:      { icon: '✕',  color: 'var(--danger)',   bg: 'rgba(239,68,68,0.12)',    label: 'ERREUR' },
    };
    const sc  = statusConfig[rush.status || 'done'] || statusConfig.done;
    const dur = (rush.shots || []).reduce((a, s) => a + (s.duration || 5), 0);

    return `
      <div style="border-radius:6px;background:${sc.bg};border:1px solid rgba(255,255,255,0.04)" id="queue-item-${rush.id}">
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px">
          <span style="font-family:var(--font-mono);font-size:12px;color:${sc.color};flex-shrink:0;width:14px">${sc.icon}</span>
          <span style="font-family:var(--font-mono);font-size:9px;color:${sc.color};flex-shrink:0;width:70px;letter-spacing:0.5px">${sc.label}</span>
          <span style="font-size:11px;color:var(--text-1);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(rush.name || rush.id)}</span>
          <span class="text-muted" style="font-size:9px;flex-shrink:0;font-family:var(--font-mono)">${(rush.shots || []).length}p · ${dur}s</span>
          ${rush.status === 'generating' ? `
            <div class="shot-progress" style="width:60px;flex-shrink:0">
              <div class="shot-progress-bar" id="qitem-bar-${rush.id}" style="width:${rush._progress || 10}%"></div>
            </div>
          ` : ''}
          ${rush.status === 'error' ? `
            <button style="font-size:9px;background:none;border:none;color:var(--accent);cursor:pointer;padding:0 4px;flex-shrink:0" onclick="ModuleShots.retryRush('${rush.id}')">↺ RETRY</button>
          ` : ''}
        </div>
        ${rush.status === 'error' && rush.error ? `
          <div style="padding:4px 10px 8px 34px;font-family:var(--font-mono);font-size:9px;color:var(--danger);line-height:1.4;word-break:break-all">
            ⚠ ${escHtml(rush.error)}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderRushCard(rush, index) {
    const dur = (rush.shots || []).reduce((a, s) => a + (s.duration || 5), 0);
    const sectionLabel = rush.sectionType
      ? (PromptEngine.SECTION_TYPES[rush.sectionType]?.label || rush.sectionType)
      : '';

    return `
      <div class="shot-card ${rush.validated ? 'validated' : ''}" id="rush-card-${rush.id}" style="margin-bottom:12px">
        <div class="shot-card-header">
          ${sectionLabel ? `<span class="shot-section">${escHtml(sectionLabel)}</span>` : ''}
          <span class="shot-number" style="margin-left:${sectionLabel ? '6px' : '0'}">${escHtml(rush.name || '')}</span>
          <span class="text-muted text-small" style="margin-left:auto">
            ${(rush.shots || []).length} plans · ${dur}s · ${rush.mode === 'pro' ? '1080p' : '720p'}
          </span>
          ${rush.validated ? '<span class="pill pill-locked" style="margin-left:6px">✓ VALIDÉ</span>' : ''}
        </div>

        <div class="shot-thumb">
          ${rush.videoUrl
            ? `<video src="${rush.videoUrl}" muted loop playsinline style="width:100%;height:100%;object-fit:cover"
                     onmouseenter="this.play()" onmouseleave="this.pause()"></video>`
            : rush.status === 'error'
              ? `<div class="shot-thumb-placeholder" style="background:rgba(239,68,68,0.08);flex-direction:column;gap:8px;padding:12px;text-align:center">
                  <div style="font-size:20px">⚠</div>
                  <div style="font-size:9px;color:var(--danger);font-family:var(--font-mono);line-height:1.4;word-break:break-all">${escHtml((rush.error || 'Erreur inconnue').substring(0, 120))}</div>
                  <button class="btn btn-ghost btn-sm" style="font-size:9px;margin-top:4px" onclick="ModuleShots.retryRush('${rush.id}')">↺ Réessayer</button>
                </div>`
              : `<div class="shot-thumb-placeholder">
                  <div class="ph-icon">▶</div>
                  <div class="ph-text">EN ATTENTE</div>
                </div>`
          }
        </div>

        <!-- Prompts des plans -->
        <div style="padding:8px 14px">
          ${(rush.shots || []).map((s, i) => `
            <div class="text-muted" style="font-size:9px;margin-bottom:4px;font-family:var(--font-mono);line-height:1.4">
              <strong style="color:var(--text-2)">P${i + 1} (${s.duration}s)</strong>
              ${escHtml((s.prompt || '').substring(0, 100))}${(s.prompt || '').length > 100 ? '…' : ''}
            </div>
          `).join('')}
        </div>

        <div class="shot-actions">
          ${rush.videoUrl && !rush.validated
            ? `<button style="background:var(--locked-dim);color:var(--locked)" onclick="ModuleShots.validate('${rush.id}')">✓ VALIDER</button>`
            : ''}
          ${rush.validated
            ? `<button style="background:rgba(239,68,68,0.1);color:var(--danger)" onclick="ModuleShots.unvalidate('${rush.id}')">✕ RETIRER</button>`
            : ''}
          ${rush.videoUrl
            ? `<button style="background:var(--bg-3);color:var(--text-2)" onclick="ModuleShots.downloadRush('${rush.id}')">⬇</button>`
            : ''}
          <button style="background:rgba(239,68,68,0.1);color:var(--danger)" onclick="ModuleShots.deleteRush('${rush.id}')">🗑</button>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // GÉNÉRATION D'UNE SECTION
  // ─────────────────────────────────────────────────────────────────

  async generateSection(sectionIndex) {
    const p = State.currentProject();
    if (!p.scriptSections?.[sectionIndex]) {
      Toast.error('Section introuvable'); return;
    }

    let section    = { ...p.scriptSections[sectionIndex], _position: this._getSectionPosition(sectionIndex, p.scriptSections.length) };

    // ── CONTRÔLEUR DE COHÉRENCE ──────────────────────────────────────
    // Si la section n'a pas de contenu, générer une description automatique
    if (!section.content?.trim()) {
      const sectionDef = PromptEngine.SECTION_TYPES[section.type] || PromptEngine.SECTION_TYPES['verse'];
      const playbook   = PromptEngine.getPlaybook(p.genre) || PromptEngine.getPlaybook('hip-hop');
      section = {
        ...section,
        content: `${sectionDef.klingHint}. ${playbook.klingStyle}. ${section.label || section.type} — séquence visuelle cinématique.`,
      };
      Toast.info(`Section "${section.label}" sans contenu — description auto générée`);
    }

    const sectionDur = PromptEngine.estimateSectionDuration(p, sectionIndex);
    const plan       = PromptEngine.planSectionRushes(section, p, sectionDur);
    const { tags }   = KlingAPI.buildReferenceImages(p);
    const sectionLabel = PromptEngine.SECTION_TYPES[section.type]?.label || section.type;

    // UI feedback
    const btn      = document.getElementById(`btn-gen-section-${sectionIndex}`);
    const progDiv  = document.getElementById(`section-progress-${sectionIndex}`);
    const progBar  = document.getElementById(`section-prog-bar-${sectionIndex}`);
    const progLbl  = document.getElementById(`section-prog-label-${sectionIndex}`);
    if (btn)     btn.disabled = true;
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '15%';
    if (progLbl) progLbl.textContent  = `Claude génère ${plan.shotCount} prompts…`;

    try {
      // 1. Claude génère les prompts
      const shots = await ClaudeAPI.generateSectionPrompts(
        section, p, tags, plan.shotCount,
        (step) => {
          if (progBar) progBar.style.width = step === 'calling' ? '30%' : '70%';
          if (progLbl) progLbl.textContent  = step === 'calling' ? 'Appel Claude API…' : 'Analyse de la réponse…';
        }
      );

      if (progBar) progBar.style.width = '85%';
      if (progLbl) progLbl.textContent  = `Packing ${shots.length} shots en rushes…`;

      // 2. Packer les shots en rushes
      const rushItems = this._packShotsIntoRushes(shots, sectionIndex, sectionLabel, section.type, p);

      // 3. Ajouter à p.rushes
      const pUp = State.currentProject();
      pUp.rushes = pUp.rushes || [];
      pUp.rushes.push(...rushItems);
      State.save();

      Toast.success(`${sectionLabel} : ${rushItems.length} rushes créés — lancement de la file`);

      // 4. Démarrer la queue automatiquement
      this.startQueue();

    } catch (e) {
      Toast.error(`Génération section : ${e.message}`);
    }

    if (btn)     { btn.disabled = false; }
    if (progDiv) progDiv.style.display = 'none';
    this.render();
    App.updateBadges();
  },

  async generateAllSections() {
    const p = State.currentProject();
    if (!p.scriptSections?.length) { Toast.error('Aucun script — créez le script d\'abord'); return; }

    Toast.info(`Génération de ${p.scriptSections.length} sections en cours…`);
    for (let i = 0; i < p.scriptSections.length; i++) {
      await this.generateSection(i);
      // Petite pause entre sections pour ne pas saturer Claude
      if (i < p.scriptSections.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    Toast.success('Toutes les sections générées — file Kling 3 active');
  },

  // ─────────────────────────────────────────────────────────────────
  // PACKING shots → rushes
  // ─────────────────────────────────────────────────────────────────

  _packShotsIntoRushes(shots, sectionIndex, sectionLabel, sectionType, project) {
    // Rush = 10s fixe, max 6 shots par rush
    // Les shots sont groupés, klingApi répartit la durée uniformément
    const SHOTS_PER_RUSH = 3; // 3 shots × ~3s = 10s — bon équilibre
    const mode   = 'standard'; // Kling 3 = toujours standard (pro = qualité+)
    const aspect = project.aspectRatio || '16:9'; // vient bien du projet
    const existingCount = (project.rushes || []).filter(r => r.sectionIndex === sectionIndex).length;

    const rushes = [];
    for (let i = 0; i < shots.length; i += SHOTS_PER_RUSH) {
      const group = shots.slice(i, i + SHOTS_PER_RUSH);
      rushes.push(this._makeRushItem(group, sectionIndex, sectionLabel, sectionType, existingCount + rushes.length, mode, aspect));
    }
    return rushes;
  },

  _makeRushItem(shots, sectionIndex, sectionLabel, sectionType, num, mode, aspect) {
    return {
      id:           `rush_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name:         `${sectionLabel} — Rush ${String(num + 1).padStart(2, '0')}`,
      sectionIndex,
      sectionType,
      shots:        shots.map(s => ({
        prompt:         s.prompt,
        negativePrompt: s.negativePrompt,
        duration:       s.duration,
        description:    s.description,
      })),
      mode,
      aspectRatio:  aspect,
      status:       'pending',
      videoUrl:     null,
      predId:       null,
      validated:    false,
      _progress:    0,
      error:        null,
      createdAt:    Date.now(),
    };
  },

  // ─────────────────────────────────────────────────────────────────
  // QUEUE KLING 3
  // ─────────────────────────────────────────────────────────────────

  startQueue() {
    if (this._queueRunning) return;
    this._queueAborted  = false;
    this._queueRunning  = true;
    Toast.info('File Kling 3 démarrée');
    this._processNextInQueue();
    this.render();
  },

  pauseQueue() {
    this._queueAborted = true;
    this._queueRunning = false;
    Toast.info('File en pause — les rushes en cours continuent');
    this.render();
  },

  async _processNextInQueue() {
    if (this._queueAborted) { this._queueRunning = false; this.render(); return; }

    const p      = State.currentProject();
    const rushes = p.rushes || [];
    const next   = rushes.find(r => r.status === 'pending' || r.status === 'queued');

    if (!next) {
      // File vide — terminée
      this._queueRunning = false;
      const done = rushes.filter(r => r.status === 'done').length;
      if (done > 0) Toast.success(`🎬 File terminée — ${done} rushes générés`);
      this.render();
      App.updateBadges();
      App.updateSidebarStats();
      return;
    }

    // Marquer en génération
    next.status    = 'generating';
    next._progress = 5;
    State.save();
    this._updateQueueItemUI(next);

    try {
      const videoUrl = await KlingAPI.generateMultishotAndWait(
        {
          shots:         next.shots,
          negativePrompt: next.shots[0]?.negativePrompt || '',
          mode:          next.mode || 'standard',
          aspectRatio:   next.aspectRatio || '16:9',
        },
        State.currentProject(),
        (pct) => {
          const pUp = State.currentProject();
          const r   = (pUp.rushes || []).find(r => r.id === next.id);
          if (r) { r._progress = pct; State.save(); }
          this._updateQueueItemUI({ ...next, _progress: pct });
        }
      );

      const pUp = State.currentProject();
      const r   = (pUp.rushes || []).find(r => r.id === next.id);
      if (r) {
        r.status    = 'done';
        r.videoUrl  = videoUrl;
        r._progress = 100;
        State.save();
      }
      Toast.success(`Rush "${next.name}" généré ✓`);

    } catch (e) {
      const pUp = State.currentProject();
      const r   = (pUp.rushes || []).find(r => r.id === next.id);
      if (r) { r.status = 'error'; r.error = e.message; State.save(); }
      Toast.error(`Rush "${next.name}" : ${e.message.substring(0, 60)}`);
    }

    this.render();
    App.updateBadges();
    App.updateSidebarStats();

    // Continuer la file après 1s de pause
    setTimeout(() => this._processNextInQueue(), 1000);
  },

  _updateQueueItemUI(rush) {
    const itemEl = document.getElementById(`queue-item-${rush.id}`);
    if (itemEl) {
      const bar = document.getElementById(`qitem-bar-${rush.id}`);
      if (bar) bar.style.width = (rush._progress || 10) + '%';
    }
  },

  retryErrors() {
    const p = State.currentProject();
    (p.rushes || []).forEach(r => { if (r.status === 'error') { r.status = 'pending'; r.error = null; } });
    State.save();
    this.startQueue();
    this.render();
  },

  retryRush(rushId) {
    const p = State.currentProject();
    const r = (p.rushes || []).find(r => r.id === rushId);
    if (!r) return;
    r.status = 'pending';
    r.error  = null;
    State.save();
    this.startQueue();
    this.render();
  },

  clearDone() {
    Toast.info('Rushes conservés — validez ceux que vous souhaitez garder');
  },

  clearAllRushes() {
    if (!confirm('Effacer tous les rushes (y compris validés) ?')) return;
    const p = State.currentProject();
    p.rushes = [];
    State.save();
    this.render();
    App.updateBadges();
  },

  // ─────────────────────────────────────────────────────────────────
  // VALIDATION ET TÉLÉCHARGEMENT
  // ─────────────────────────────────────────────────────────────────

  async validate(rushId) {
    const p    = State.currentProject();
    const rush = (p.rushes || []).find(r => r.id === rushId);
    if (!rush) return;
    rush.validated = true;
    State.save();
    Toast.success(`Rush validé ✓ — téléchargement en cours`);
    if (rush.videoUrl) await Downloader.download(rush.videoUrl, `${rush.name || 'rush'}.mp4`);
    this.render();
    App.updateBadges();
    App.updateSidebarStats();
  },

  unvalidate(rushId) {
    const p    = State.currentProject();
    const rush = (p.rushes || []).find(r => r.id === rushId);
    if (!rush) return;
    rush.validated = false;
    State.save();
    this.render();
    App.updateBadges();
    App.updateSidebarStats();
  },

  async downloadRush(rushId) {
    const p    = State.currentProject();
    const rush = (p.rushes || []).find(r => r.id === rushId);
    if (!rush?.videoUrl) { Toast.error('Pas de vidéo disponible'); return; }
    await Downloader.download(rush.videoUrl, `${rush.name || 'rush'}.mp4`);
  },

  deleteRush(rushId) {
    if (!confirm('Supprimer ce rush ?')) return;
    const p = State.currentProject();
    p.rushes = (p.rushes || []).filter(r => r.id !== rushId);
    State.save();
    this.render();
    App.updateBadges();
    App.updateSidebarStats();
  },

  // ─────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────

  _getSectionPosition(index, total) {
    if (total <= 1) return 'full clip';
    const pct = index / (total - 1);
    if (pct < 0.15) return 'opening — establish world and character';
    if (pct < 0.4)  return 'early — build narrative tension';
    if (pct < 0.6)  return 'mid-clip — peak energy';
    if (pct < 0.85) return 'late — sustain and vary';
    return 'finale — resolution and closing image';
  },
};
