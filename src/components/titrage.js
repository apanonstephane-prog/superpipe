/**
 * MODULE TITRAGES — Effets Visuels & Séquences IA
 *
 * Génère des visuels cinématiques (VFX, ILM, WETA, 3D, particules...)
 * via Nano Banana Pro. Les images verrouillées sont injectées dans Kling 3.
 */

const ModuleTitrage = {

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-titrage');
    if (!el) return;

    const titrages    = p.titrages || [];
    const lockedCount = titrages.filter(t => t.locked).length;

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Titrages <span>VFX</span></div>
        <div class="module-desc">Générez des visuels cinématiques avec Nano Banana Pro — séquences VFX, effets 3D, particules, titres animés. Les images verrouillées sont injectées dans Kling 3.</div>
      </div>

      ${lockedCount > 0 ? `<div style="margin-bottom:16px"><span class="lock-badge">${lockedCount} visuel${lockedCount > 1 ? 's' : ''} verrouillé${lockedCount > 1 ? 's' : ''}</span></div>` : ''}

      <div class="card">
        <div class="card-title">Générer un visuel</div>

        <!-- Prompt -->
        <div class="field">
          <label>Description / Prompt</label>
          <textarea id="tit-prompt" rows="3"
            placeholder="Ex: explosion nucléaire ralentie, particules de lumière dorée qui explosent vers la caméra, fond noir, ultra cinématique, ILM style..."></textarea>
        </div>

        <!-- Chips style -->
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Style</div>
          <div id="tit-style-chips" style="display:flex;gap:6px;flex-wrap:wrap">
            ${['ILM', 'VFX', '3D Render', 'WETA Digital', 'Particules', 'Holographique', 'Néon Glitch', 'Feu & Fumée', 'Eau & Fluide', 'Cosmique', 'Matrix', 'Cyber'].map(s => `
              <button class="chip-btn" onclick="ModuleTitrage.toggleChip(this)">${s}</button>
            `).join('')}
          </div>
        </div>

        <!-- Format -->
        <div class="field-row">
          <div class="field">
            <label>Format</label>
            <select id="tit-aspect">
              <option value="16:9">16:9 — Cinéma / widescreen</option>
              <option value="9:16">9:16 — Vertical (stories)</option>
              <option value="1:1">1:1 — Carré</option>
              <option value="2:3">2:3 — Portrait</option>
              <option value="21:9">21:9 — Ultra wide</option>
            </select>
          </div>
          <div class="field">
            <label>Résolution</label>
            <select id="tit-resolution">
              <option value="2K">2K</option>
              <option value="4K">4K</option>
              <option value="1K">1K</option>
            </select>
          </div>
        </div>

        <!-- Presets rapides -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Presets</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${[
              ['💥 Explosion ILM',   'massive shockwave explosion, slow motion debris and fire, ILM cinematic VFX, black background, ultra detailed, photorealistic'],
              ['✨ Particules gold',  'thousands of golden light particles swirling, magic dust, dark background, ultra cinematic, bokeh, luxury'],
              ['🌀 Portal VFX',      'swirling interdimensional portal, electric blue energy, WETA digital VFX, dramatic lighting, cinematic'],
              ['🔥 Feu ralenti',     'slow motion fire and embers floating upward, deep red and orange, high speed camera, cinematic VFX, black background'],
              ['🌊 Vague fluide',    'abstract fluid simulation, liquid metal chrome waves, 3D render, Houdini FX, photorealistic, studio lighting'],
              ['⚡ Foudre cyber',    'cyberpunk lightning bolts, neon blue and purple electricity, dark stormy sky, Matrix aesthetic, ultra detailed'],
              ['🌌 Nébuleuse',       'deep space nebula explosion, cosmic dust and stars, photorealistic space photography, cinematic scope, Hubble style'],
              ['🤖 Hologramme',      'holographic data visualization, blue hologram projections, sci-fi interface, transparent digital layers, futuristic'],
            ].map(([label, prompt]) => `
              <button class="pill pill-accent" style="cursor:pointer;font-size:9px"
                      onclick="document.getElementById('tit-prompt').value=${JSON.stringify(prompt)}">
                ${label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary btn-sm" id="tit-gen-btn" onclick="ModuleTitrage.generate()">⚡ Générer</button>
        </div>

        <div id="tit-gen-progress" style="display:none;margin-top:8px">
          <div class="shot-progress"><div class="shot-progress-bar" id="tit-prog-bar" style="width:0%"></div></div>
          <div class="text-muted text-small" id="tit-gen-status" style="margin-top:4px">Génération...</div>
        </div>
      </div>

      <!-- Galerie -->
      ${titrages.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">✦</div>
          <div class="empty-state-text">Aucun visuel généré</div>
        </div>
      ` : `
        <div class="media-grid">
          ${titrages.map((t, i) => this.renderCard(t, i)).join('')}
        </div>
      `}
    `;
  },

  renderCard(t, index) {
    const isGenerating = t.generating;
    return `
      <div class="media-card" style="display:flex;flex-direction:column;${t.locked ? 'border:1px solid rgba(34,197,94,0.5)' : ''}">
        ${t.locked ? '<div class="media-locked-overlay">✓ VALIDÉ</div>' : ''}
        ${t.imageUrl
          ? `<img src="${t.imageUrl}" alt="${escHtml(t.prompt || '')}" loading="lazy"
                  style="aspect-ratio:${t.aspectRatio === '9:16' ? '9/16' : t.aspectRatio === '1:1' ? '1/1' : t.aspectRatio === '2:3' ? '2/3' : '16/9'};object-fit:cover;width:100%;cursor:pointer"
                  onclick="ModuleTitrage.preview(${index})" title="Cliquer pour agrandir" />`
          : isGenerating
            ? `<div style="aspect-ratio:16/9;background:var(--bg-3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px">
                <span style="font-size:20px">⏳</span>
                <span style="font-size:9px;color:var(--text-3);font-family:var(--font-mono)">GÉNÉRATION...</span>
              </div>`
            : `<div style="aspect-ratio:16/9;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:28px">✦</div>`
        }
        <div class="media-card-info">
          <div class="media-card-name" style="font-size:9px;line-height:1.3">${escHtml((t.prompt || '').substring(0, 50))}${(t.prompt || '').length > 50 ? '…' : ''}</div>
          ${t.styles?.length > 0 ? `<div class="text-muted text-small" style="font-size:8px">${t.styles.join(' · ')}</div>` : ''}
        </div>
        ${!isGenerating ? `
        <div class="card-actions-bar">
          <button class="btn-validate-media ${t.locked ? 'is-validated' : ''}"
                  onclick="ModuleTitrage.toggleLock(${index})">
            ${t.locked ? '🔒 VALIDÉ' : '✓ VALIDER'}
          </button>
          ${t.imageUrl && !t.locked ? `
            <button class="btn-regen-media" onclick="ModuleTitrage.regen(${index})" title="Régénérer">↺ REGEN</button>
          ` : ''}
          ${t.imageUrl && t.locked ? `
            <button class="btn-download-media" onclick="ModuleTitrage.download(${index})" title="Télécharger">⬇</button>
          ` : ''}
          <button class="btn-del-media" onclick="ModuleTitrage.remove(${index})">✕</button>
        </div>
        ` : ''}
      </div>
    `;
  },

  toggleChip(btn) {
    btn.classList.toggle('selected');
  },

  async generate() {
    const promptEl = document.getElementById('tit-prompt');
    const desc     = promptEl?.value.trim();
    if (!desc) { Toast.error('Décrivez le visuel à générer'); return; }

    const styles = Array.from(document.querySelectorAll('#tit-style-chips .chip-btn.selected')).map(b => b.textContent.trim());
    const aspect = document.getElementById('tit-aspect')?.value     || '16:9';
    const res    = document.getElementById('tit-resolution')?.value || '2K';

    const styleStr = styles.length > 0 ? `, ${styles.join(', ')}` : '';
    const prompt   = `${desc}${styleStr}`;

    const btn     = document.getElementById('tit-gen-btn');
    const progDiv = document.getElementById('tit-gen-progress');
    const progBar = document.getElementById('tit-prog-bar');
    const progSt  = document.getElementById('tit-gen-status');

    if (btn) btn.disabled = true;
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width   = '0%';
    if (progSt)  progSt.textContent    = 'Génération nano-banana-pro...';

    const p    = State.currentProject();
    p.titrages = p.titrages || [];
    const idx  = p.titrages.length;
    p.titrages.push({ id: `tit_${Date.now()}`, prompt: desc, styles, aspectRatio: aspect, imageUrl: null, generating: true, locked: false });
    State.save();
    this.render();

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs: [], aspectRatio: aspect, resolution: res },
        (pct) => {
          if (progBar) progBar.style.width  = pct + '%';
          if (progSt)  progSt.textContent   = pct < 50 ? 'Génération en cours...' : 'Finalisation...';
        }
      );

      const pUp = State.currentProject();
      if (pUp.titrages?.[idx]) {
        pUp.titrages[idx].imageUrl   = imageUrl;
        pUp.titrages[idx].generating = false;
        State.save();
      }

      if (promptEl) promptEl.value = '';
      document.querySelectorAll('#tit-style-chips .chip-btn').forEach(b => b.classList.remove('selected'));
      Toast.success('Visuel généré ✓');

    } catch (e) {
      const pUp = State.currentProject();
      if (pUp.titrages?.[idx]) { pUp.titrages[idx].generating = false; State.save(); }
      Toast.error(`Génération : ${e.message}`);
    }

    if (btn)     btn.disabled = false;
    if (progDiv) progDiv.style.display = 'none';
    this.render();
    App.updateBadges();
  },

  async regen(index) {
    const p = State.currentProject();
    if (!p.titrages?.[index]) return;
    const t = p.titrages[index];
    if (t.locked) { Toast.error('Déverrouillez d\'abord ce visuel'); return; }

    t.generating = true;
    t.imageUrl   = null;
    State.save();
    this.render();

    try {
      const styleStr = t.styles?.length > 0 ? `, ${t.styles.join(', ')}` : '';
      const prompt   = `${t.prompt}${styleStr}`;
      const imageUrl = await NanoBananaAPI.generateAndWait({ prompt, imageInputs: [], aspectRatio: t.aspectRatio || '16:9', resolution: '2K' });

      const pUp = State.currentProject();
      if (pUp.titrages?.[index]) {
        pUp.titrages[index].imageUrl   = imageUrl;
        pUp.titrages[index].generating = false;
        State.save();
      }
      Toast.success('Visuel régénéré ✓');
    } catch (e) {
      const pUp = State.currentProject();
      if (pUp.titrages?.[index]) { pUp.titrages[index].generating = false; State.save(); }
      Toast.error(`Régénération : ${e.message}`);
    }
    this.render();
  },

  toggleLock(index) {
    const p = State.currentProject();
    if (!p.titrages?.[index]) return;
    const t = p.titrages[index];
    if (!t.imageUrl && !t.locked) { Toast.error('Générez d\'abord ce visuel'); return; }

    t.locked = !t.locked;
    State.save();

    if (t.locked) {
      Toast.success('Visuel verrouillé ✓ — téléchargement en cours');
      if (t.imageUrl) Downloader.download(t.imageUrl, `titrage_vfx_${index + 1}.jpg`);
    } else {
      Toast.info('Visuel déverrouillé');
    }
    this.render();
    App.updateBadges();
  },

  download(index) {
    const p = State.currentProject();
    if (!p.titrages?.[index]?.imageUrl) return;
    Downloader.download(p.titrages[index].imageUrl, `titrage_vfx_${index + 1}.jpg`);
  },

  remove(index) {
    const p = State.currentProject();
    if (!p.titrages) return;
    if (p.titrages[index]?.locked) { Toast.error('Déverrouillez d\'abord ce visuel'); return; }
    p.titrages.splice(index, 1);
    State.save();
    this.render();
    App.updateBadges();
  },

  preview(index) {
    const p = State.currentProject();
    const t = p.titrages?.[index];
    if (!t?.imageUrl) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>VFX Preview</title>
      <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}
      img{max-width:100vw;max-height:100vh;object-fit:contain}</style></head>
      <body><img src="${t.imageUrl}" /></body></html>`);
    w.document.close();
  },
};
