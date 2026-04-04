/**
 * MODULE LREF — Lieux (Location Reference)
 *
 * Workflow :
 *  1. Créer 3 lieux : prompt + photo optionnelle → nano-banana-pro génère l'image
 *  2. Verrouiller les lieux validés
 *  3. Pour chaque lieu verrouillé → générer 4 angles différents via nano-banana-pro
 *  4. Verrouiller les angles validés → auto-téléchargement
 *
 * Règle : seules les images verrouillées sont téléchargées et injectées dans Kling 3.
 */

const ModuleLRef = {

  _createMode: 'generate', // 'generate' | 'upload'

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-lref');
    const lockedCount = (p.locations || []).filter(l => l.locked).length;

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Lieux <span>LRef</span></div>
        <div class="module-desc">Créez 3 lieux avec Nano Banana Pro. Pour chaque lieu verrouillé, générez 4 angles différents. Seules les images verrouillées sont téléchargées et injectées dans Kling 3.</div>
      </div>

      ${lockedCount > 0 ? `<div style="margin-bottom:16px"><span class="lock-badge">${lockedCount} lieu${lockedCount > 1 ? 'x' : ''} verrouillé${lockedCount > 1 ? 's' : ''}</span></div>` : ''}

      <div class="card">
        <div class="card-title">Créer un lieu</div>

        <!-- Toggle mode -->
        <div style="display:flex;gap:6px;margin-bottom:14px">
          <button class="btn btn-sm ${this._createMode === 'generate' ? 'btn-primary' : 'btn-ghost'}"
                  onclick="ModuleLRef._createMode='generate';ModuleLRef.render()">✦ Générer de zéro</button>
          <button class="btn btn-sm ${this._createMode === 'upload' ? 'btn-primary' : 'btn-ghost'}"
                  onclick="ModuleLRef._createMode='upload';ModuleLRef.render()">📁 Upload référence</button>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Nom du lieu</label>
            <input type="text" id="lref-new-name" placeholder="Rooftop Paris, Studio Brooklyn..." />
          </div>
          <div class="field">
            <label>Ambiance</label>
            <input type="text" id="lref-new-mood" placeholder="nuit, golden hour, néons..." />
          </div>
        </div>
        <div class="field">
          <label>Description ${this._createMode === 'generate' ? '(l\'IA génère depuis ce texte)' : '(optionnelle)'}</label>
          <textarea id="lref-new-prompt" rows="2"
            placeholder="${this._createMode === 'generate'
              ? 'Ex: rooftop parisien la nuit, lumières de la ville, béton et acier, ambiance urbaine cinématique...'
              : 'Ex: même ambiance, lumière chaude... (optionnel)'}"></textarea>
        </div>

        <!-- Format + Résolution -->
        <div class="field-row">
          <div class="field">
            <label>Format</label>
            <select id="lref-aspect">
              <option value="16:9">16:9 — Cinéma / widescreen</option>
              <option value="9:16">9:16 — Vertical (stories)</option>
              <option value="1:1">1:1 — Carré</option>
              <option value="4:3">4:3 — Paysage standard</option>
              <option value="3:2">3:2 — Paysage photo</option>
              <option value="2:3">2:3 — Portrait</option>
              <option value="21:9">21:9 — Ultra wide</option>
            </select>
          </div>
          <div class="field">
            <label>Résolution</label>
            <select id="lref-resolution">
              <option value="2K">2K</option>
              <option value="4K">4K</option>
              <option value="1K">1K</option>
            </select>
          </div>
        </div>

        ${this._createMode === 'upload' ? `
        <div class="upload-zone" id="lref-upload-zone" onclick="document.getElementById('lref-file').click()">
          <div class="upload-zone-icon">◫</div>
          <div class="upload-zone-text">Photo de référence</div>
          <div class="upload-zone-hint">L'IA s'en inspirera pour générer le lieu</div>
        </div>
        <input type="file" id="lref-file" accept="image/*" style="display:none" />
        ` : `<input type="file" id="lref-file" accept="image/*" style="display:none" />`}

        <div class="btn-row" style="margin-top:8px">
          <button class="btn btn-primary btn-sm" onclick="ModuleLRef.generateLieu()">⚡ Générer ce lieu</button>
          <button class="btn btn-ghost btn-sm"   onclick="ModuleLRef.addTextOnly()">+ Texte seul (sans image)</button>
        </div>
        <div id="lref-gen-progress" style="display:none;margin-top:8px">
          <div class="shot-progress"><div class="shot-progress-bar" id="lref-prog-bar" style="width:0%"></div></div>
          <div class="text-muted text-small" id="lref-gen-status" style="margin-top:4px">Génération...</div>
        </div>
      </div>

      ${(p.locations || []).length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">◫</div>
          <div class="empty-state-text">Aucun lieu créé</div>
        </div>
      ` : (p.locations || []).map(l => this.renderLocSection(l)).join('')}
    `;

    this.setupDragDrop();
  },

  renderLocSection(l) {
    const lockedAngles = (l.angles || []).filter(a => a.locked);
    const locImg = l.imageUrl || l.base64;

    return `
      <div class="card" id="loc-card-${l.id}" style="${l.locked ? 'border-color:rgba(34,197,94,0.4)' : ''}">

        <!-- Entête lieu : nom + supprimer -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-weight:700;color:var(--text-0)">${escHtml(l.name)}</div>
            ${l.mood ? `<div class="text-muted text-small">${escHtml(l.mood)}</div>` : ''}
            <div class="text-muted text-small">${(l.angles || []).length} angle(s) · ${lockedAngles.length} verrouillé(s)</div>
          </div>
          <button class="btn-del-media" onclick="ModuleLRef.remove('${l.id}')" title="Supprimer">✕</button>
        </div>

        <!-- Image principale du lieu -->
        <div style="position:relative;margin-bottom:10px">
          ${l.locked ? '<div class="media-locked-overlay">✓ VALIDÉ</div>' : ''}
          ${locImg
            ? `<img src="${locImg}"
                    style="width:100%;aspect-ratio:${(l.aspectRatio || '16:9').replace(':', '/')};object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid ${l.locked ? 'rgba(34,197,94,0.5)' : 'var(--border-1)'}"
                    title="Cliquer pour agrandir"
                    onclick="ModuleLRef.previewLieu('${l.id}')" />`
            : `<div style="width:100%;aspect-ratio:${(l.aspectRatio || '16:9').replace(':', '/')};background:var(--bg-3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px">◫</div>`
          }
        </div>

        <!-- Actions : VALIDER / REGEN / ⬇ -->
        <div class="card-actions-bar" style="margin-bottom:14px">
          <button class="btn-validate-media ${l.locked ? 'is-validated' : ''}"
                  onclick="ModuleLRef.toggleLock('${l.id}')"
                  title="${l.locked ? 'Déverrouiller' : 'Valider ce lieu'}">
            ${l.locked ? '🔒 VALIDÉ' : '✓ VALIDER'}
          </button>
          ${locImg && !l.locked ? `
            <button class="btn-regen-media"
                    onclick="ModuleLRef.regenerateLieu('${l.id}')"
                    title="Régénérer ce lieu">↺ REGEN</button>
          ` : ''}
          ${locImg ? `
            <button class="btn-download-media"
                    onclick="ModuleLRef.downloadLieu('${l.id}')"
                    title="Télécharger">⬇</button>
          ` : ''}
        </div>

        <!-- Angles (seulement si lieu verrouillé) -->
        ${l.locked ? `
          <div style="background:var(--bg-3);border-radius:8px;padding:12px;margin-bottom:${(l.angles || []).length > 0 ? '16px' : '0'}">
            <div class="card-title" style="margin-bottom:8px;font-size:11px">⚡ GÉNÉRER UN ANGLE DE VUE</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
              ${['Vue frontale large', 'Vue latérale', 'Vue aérienne', 'Vue arrière', 'Close-up détail', 'Grand angle'].map(a => `
                <button class="pill pill-accent" style="cursor:pointer;font-size:9px"
                        onclick="ModuleLRef.setAnglePreset('${l.id}', '${a}')">${a}</button>
              `).join('')}
            </div>
            <textarea id="angle-prompt-${l.id}" rows="2"
              placeholder="Ou décrivez un angle personnalisé..."></textarea>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-primary btn-sm" onclick="ModuleLRef.generateAngle('${l.id}')">⚡ Générer cet angle</button>
              <button class="btn btn-ghost btn-sm"   onclick="ModuleLRef.generate4Angles('${l.id}')">⚡⚡ 4 angles auto</button>
            </div>
            <div id="angle-progress-${l.id}" style="display:none;margin-top:8px">
              <div class="shot-progress"><div class="shot-progress-bar" id="angle-prog-bar-${l.id}" style="width:0%"></div></div>
              <div class="text-muted text-small" id="angle-status-${l.id}" style="margin-top:4px">Génération...</div>
            </div>
          </div>

          ${(l.angles || []).length > 0 ? `
            <div class="card-title" style="margin-bottom:8px;font-size:11px">ANGLES GÉNÉRÉS</div>
            <div class="media-grid">
              ${(l.angles || []).map((a, i) => this.renderAngleCard(l.id, a, i)).join('')}
            </div>
          ` : ''}
        ` : ''}

      </div>
    `;
  },

  renderAngleCard(locId, angle, index) {
    const isGenerating = angle.generating;
    return `
      <div class="media-card media-card-aspect-wide" style="display:flex;flex-direction:column;${angle.locked ? 'border:1px solid rgba(34,197,94,0.5)' : ''}">
        ${angle.locked ? '<div class="media-locked-overlay">✓ VALIDÉ</div>' : ''}
        ${angle.imageUrl
          ? `<img src="${angle.imageUrl}" alt="${escHtml(angle.description)}" loading="lazy" style="aspect-ratio:16/9;object-fit:cover;width:100%" />`
          : isGenerating
            ? `<div style="aspect-ratio:16/9;background:var(--bg-3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px"><span>⏳</span><span style="font-size:9px;color:var(--text-3);font-family:var(--font-mono)">GÉNÉRATION...</span></div>`
            : `<div style="aspect-ratio:16/9;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:22px">◫</div>`
        }
        <div class="media-card-info">
          <div class="media-card-name" style="font-size:9px">${escHtml((angle.description || '').substring(0, 40))}</div>
        </div>
        ${!isGenerating ? `
        <div class="card-actions-bar">
          <button class="btn-validate-media ${angle.locked ? 'is-validated' : ''}"
                  onclick="ModuleLRef.toggleAngleLock('${locId}', ${index})"
                  title="${angle.locked ? 'Déverrouiller' : 'Valider et télécharger'}">
            ${angle.locked ? '🔒 VALIDÉ' : '✓ VALIDER'}
          </button>
          ${angle.imageUrl && !angle.locked ? `
          <button class="btn-regen-media"
                  onclick="ModuleLRef.regenerateAngle('${locId}', ${index})"
                  title="Régénérer cet angle">↺ REGEN</button>
          ` : ''}
          ${angle.imageUrl && angle.locked ? `
          <button class="btn-download-media" onclick="ModuleLRef.downloadAngle('${locId}', ${index})" title="Télécharger">⬇</button>
          ` : ''}
          <button class="btn-del-media" onclick="ModuleLRef.removeAngle('${locId}', ${index})" title="Supprimer">✕</button>
        </div>
        ` : ''}
      </div>
    `;
  },

  // ── Générer un lieu via nano-banana-pro ──
  async generateLieu() {
    const name       = document.getElementById('lref-new-name')?.value.trim();
    const mood       = document.getElementById('lref-new-mood')?.value.trim();
    const desc       = document.getElementById('lref-new-prompt')?.value.trim();
    const aspectRatio = document.getElementById('lref-aspect')?.value     || '16:9';
    const resolution  = document.getElementById('lref-resolution')?.value || '2K';

    if (!name) { Toast.error('Donnez un nom au lieu'); return; }
    if (!desc)  { Toast.error('Décrivez le lieu pour la génération'); return; }

    const progDiv    = document.getElementById('lref-gen-progress');
    const progBar    = document.getElementById('lref-prog-bar');
    const progStatus = document.getElementById('lref-gen-status');
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '0%';
    if (progStatus) progStatus.textContent = 'Génération nano-banana-pro...';

    const fileInput   = document.getElementById('lref-file');
    const imageInputs = [];
    if (fileInput?.files?.[0]) {
      const b64 = await Downloader.fileToBase64(fileInput.files[0]);
      imageInputs.push(b64);
    }

    const prompt = `${desc}${mood ? ', ' + mood : ''}, architectural photography, cinematic location, professional quality, empty space, no people`;

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs, aspectRatio, resolution },
        (pct) => {
          if (progBar) progBar.style.width = pct + '%';
          if (progStatus) progStatus.textContent = pct < 50 ? 'Génération en cours...' : 'Finalisation...';
        }
      );

      State.addLocation({ name, mood, promptDesc: desc, aspectRatio, imageUrl, base64: imageInputs[0] || null });

      document.getElementById('lref-new-name').value   = '';
      document.getElementById('lref-new-mood').value   = '';
      document.getElementById('lref-new-prompt').value = '';
      if (fileInput) fileInput.value = '';

      Toast.success(`Lieu "${name}" généré ✓`);

    } catch (e) {
      Toast.error(`Génération : ${e.message}`);
    }

    if (progDiv) progDiv.style.display = 'none';
    this.render();
    App.updateBadges();
  },

  // ── Ajouter un lieu sans génération (texte seul) ──
  addTextOnly() {
    const name = document.getElementById('lref-new-name')?.value.trim();
    if (!name) { Toast.error('Donnez un nom au lieu'); return; }
    const mood = document.getElementById('lref-new-mood')?.value.trim();
    const desc = document.getElementById('lref-new-prompt')?.value.trim();
    State.addLocation({ name, mood, promptDesc: desc, imageUrl: null, base64: null });
    this._clearForm();
    Toast.success(`Lieu "${name}" ajouté`);
    this.render();
    App.updateBadges();
  },

  _clearForm() {
    ['lref-new-name', 'lref-new-mood', 'lref-new-prompt'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  setAnglePreset(locId, preset) {
    const el = document.getElementById(`angle-prompt-${locId}`);
    if (el) el.value = preset;
  },

  // ── Générer un angle ──
  async generateAngle(locId) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l) return;

    const anglePromptEl = document.getElementById(`angle-prompt-${locId}`);
    const angleDesc     = anglePromptEl?.value.trim();
    if (!angleDesc) { Toast.error('Décrivez l\'angle à générer'); return; }

    const progDiv    = document.getElementById(`angle-progress-${locId}`);
    const progBar    = document.getElementById(`angle-prog-bar-${locId}`);
    const progStatus = document.getElementById(`angle-status-${locId}`);
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '0%';
    if (progStatus) progStatus.textContent = 'Génération...';

    l.angles = l.angles || [];
    const angleIndex = l.angles.length;
    l.angles.push({ description: angleDesc, imageUrl: null, generating: true, locked: false });
    State.save();
    this.render();

    const srcImg      = l.imageUrl || l.base64;
    const imageInputs = srcImg ? [srcImg] : [];
    const prompt      = `${angleDesc} of ${l.name}${l.mood ? ', ' + l.mood : ''}, same location, same atmosphere, architectural photography, cinematic, no people`;

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs, aspectRatio: '16:9', resolution: '2K' },
        (pct) => {
          if (progBar) progBar.style.width = pct + '%';
          if (progStatus) progStatus.textContent = pct < 50 ? 'Génération...' : 'Finalisation...';
        }
      );

      const pUp = State.currentProject();
      const lUp = pUp.locations.find(l => l.id === locId);
      if (lUp?.angles?.[angleIndex]) {
        lUp.angles[angleIndex].imageUrl   = imageUrl;
        lUp.angles[angleIndex].generating = false;
        State.save();
      }

      if (anglePromptEl) anglePromptEl.value = '';
      Toast.success(`Angle "${angleDesc}" généré ✓`);

    } catch (e) {
      const pUp = State.currentProject();
      const lUp = pUp.locations.find(l => l.id === locId);
      if (lUp?.angles?.[angleIndex]) {
        lUp.angles[angleIndex].generating = false;
        lUp.angles[angleIndex].error      = true;
        State.save();
      }
      Toast.error(`Génération : ${e.message}`);
    }

    if (progDiv) progDiv.style.display = 'none';
    this.render();
  },

  // ── Générer 4 angles automatiquement ──
  async generate4Angles(locId) {
    const angles = [
      'Vue frontale large, grand angle',
      'Vue latérale, plan moyen',
      'Vue aérienne plongeante',
      'Close-up détail texture et matière',
    ];

    Toast.info('Génération de 4 angles en cours...');

    for (const angle of angles) {
      const el = document.getElementById(`angle-prompt-${locId}`);
      if (el) el.value = angle;
      await this.generateAngle(locId);
      await new Promise(r => setTimeout(r, 300));
    }

    Toast.success('4 angles générés — verrouillez les meilleurs');
  },

  // ── Verrouiller/déverrouiller un angle ──
  toggleAngleLock(locId, index) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l?.angles?.[index]) return;

    const angle = l.angles[index];
    if (!angle.imageUrl && !angle.locked) { Toast.error('Générez d\'abord cet angle'); return; }

    angle.locked = !angle.locked;
    State.save();

    if (angle.locked) {
      Toast.success('Angle verrouillé ✓ — téléchargement en cours');
      if (angle.imageUrl) Downloader.download(angle.imageUrl, `${l.name}_${angle.description}_angle.jpg`);
    } else {
      Toast.info('Angle déverrouillé');
    }

    this.render();
  },

  downloadAngle(locId, index) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l?.angles?.[index]?.imageUrl) return;
    Downloader.download(l.angles[index].imageUrl, `${l.name}_angle_${index + 1}.jpg`);
  },

  downloadLieu(locId) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l) return;
    const src = l.imageUrl || l.base64;
    if (!src) { Toast.error('Pas d\'image disponible'); return; }
    Downloader.download(src, `${l.name}.jpg`);
  },

  // ── Prévisualiser le lieu en plein écran ──
  previewLieu(id) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === id);
    if (!l) return;
    const src = l.imageUrl || l.base64;
    if (!src) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${l.name}</title>
      <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}
      img{max-width:100vw;max-height:100vh;object-fit:contain}</style></head>
      <body><img src="${src}" alt="${l.name}" /></body></html>`);
    w.document.close();
  },

  // ── Régénérer l'image principale du lieu ──
  async regenerateLieu(id) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === id);
    if (!l) return;
    if (l.locked) { Toast.error('Déverrouillez d\'abord ce lieu'); return; }
    const desc = l.promptDesc;
    if (!desc) { Toast.error('Description manquante pour régénérer'); return; }

    const card = document.getElementById(`loc-card-${id}`);
    Toast.info(`Régénération de "${l.name}"...`);

    const imageInputs = l.base64 ? [l.base64] : [];
    const prompt = `${desc}${l.mood ? ', ' + l.mood : ''}, architectural photography, cinematic location, professional quality, empty space, no people`;

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait({ prompt, imageInputs, aspectRatio: l.aspectRatio || '16:9', resolution: '2K' });
      const pUp = State.currentProject();
      const lUp = pUp.locations.find(l => l.id === id);
      if (lUp) { lUp.imageUrl = imageUrl; State.save(); }
      Toast.success(`"${l.name}" régénéré ✓`);
    } catch (e) {
      Toast.error(`Régénération : ${e.message}`);
    }

    this.render();
  },

  // ── Verrouiller/déverrouiller un lieu ──
  toggleLock(id) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === id);
    if (!l) return;
    const hasImage = !!(l.imageUrl || l.base64);
    if (!l.locked && !hasImage) { Toast.error('Générez d\'abord une image pour ce lieu'); return; }
    State.lockLocation(id, !l.locked);
    Toast[!l.locked ? 'success' : 'info'](!l.locked ? `🔒 ${l.name} verrouillé` : `🔓 ${l.name} déverrouillé`);
    this.render();
    App.updateBadges();
  },

  remove(id) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === id);
    if (l?.locked) { Toast.error('Déverrouillez d\'abord ce lieu'); return; }
    State.removeLocation(id);
    this.render();
    App.updateBadges();
  },

  removeAngle(locId, index) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l) return;
    l.angles.splice(index, 1);
    State.save();
    this.render();
  },

  // ── Régénérer un angle existant ──
  async regenerateAngle(locId, index) {
    const p = State.currentProject();
    const l = p.locations.find(l => l.id === locId);
    if (!l?.angles?.[index]) return;

    const angle = l.angles[index];
    if (angle.locked) { Toast.error('Déverrouillez d\'abord cet angle'); return; }

    const desc = angle.description;
    if (!desc) { Toast.error('Description manquante pour régénérer'); return; }

    angle.generating = true;
    angle.imageUrl   = null;
    State.save();
    this.render();

    try {
      const srcImg      = l.imageUrl || l.base64;
      const imageInputs = srcImg ? [srcImg] : [];
      const prompt      = `${desc} of ${l.name}${l.mood ? ', ' + l.mood : ''}, same location, same atmosphere, architectural photography, cinematic, no people`;
      const imageUrl    = await NanoBananaAPI.generateAndWait({ prompt, imageInputs, aspectRatio: '16:9', resolution: '2K' });

      const pUp = State.currentProject();
      const lUp = pUp.locations.find(l => l.id === locId);
      if (lUp?.angles?.[index]) {
        lUp.angles[index].imageUrl   = imageUrl;
        lUp.angles[index].generating = false;
        State.save();
      }
      Toast.success('Angle régénéré ✓');
    } catch (e) {
      const pUp = State.currentProject();
      const lUp = pUp.locations.find(l => l.id === locId);
      if (lUp?.angles?.[index]) { lUp.angles[index].generating = false; State.save(); }
      Toast.error(`Régénération : ${e.message}`);
    }

    this.render();
  },

  setupDragDrop() {
    const zone = document.getElementById('lref-upload-zone');
    if (!zone) return;
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('lref-file').files = dt.files;
      }
    });
  },
};
