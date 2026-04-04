/**
 * MODULE OBJETS — Props & Éléments de décor
 *
 * Workflow :
 *  1. Décrire un objet (voiture, téléphone, chaise, accessoire...)
 *  2. nano-banana-pro génère l'image
 *  3. Verrouiller les objets validés → auto-téléchargement
 *  4. Les objets verrouillés sont référencés dans les prompts Kling 3 via <<<image_X>>>
 */

const ModuleObjects = {

  _createMode: 'generate', // 'generate' | 'upload'

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-objects');
    if (!el) return;

    const objects     = p.objects || [];
    const lockedCount = objects.filter(o => o.locked).length;

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Objets <span>Props</span></div>
        <div class="module-desc">Créez des objets de décor avec Nano Banana Pro. Les objets verrouillés sont injectés dans les prompts Kling 3 comme références visuelles.</div>
      </div>

      ${lockedCount > 0 ? `<div style="margin-bottom:16px"><span class="lock-badge">${lockedCount} objet${lockedCount > 1 ? 's' : ''} verrouillé${lockedCount > 1 ? 's' : ''}</span></div>` : ''}

      <div class="card">
        <div class="card-title">Créer un objet</div>
        <div class="field-row">
          <div class="field">
            <label>Nom</label>
            <input type="text" id="obj-new-name" placeholder="Voiture noire, iPhone doré..." />
          </div>
          <div class="field">
            <label>Catégorie</label>
            <select id="obj-new-category">
              <option value="vehicle">Véhicule</option>
              <option value="device">Appareil / Tech</option>
              <option value="furniture">Meuble / Décor</option>
              <option value="accessory">Accessoire</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>
        <!-- Toggle mode -->
        <div style="display:flex;gap:6px;margin-bottom:14px">
          <button class="btn btn-sm ${this._createMode === 'generate' ? 'btn-primary' : 'btn-ghost'}"
                  onclick="ModuleObjects._createMode='generate';ModuleObjects.render()">✦ Générer de zéro</button>
          <button class="btn btn-sm ${this._createMode === 'upload' ? 'btn-primary' : 'btn-ghost'}"
                  onclick="ModuleObjects._createMode='upload';ModuleObjects.render()">📁 Upload référence</button>
        </div>

        <div class="field">
          <label>Description ${this._createMode === 'generate' ? '(l\'IA génère depuis ce texte)' : '(optionnelle)'}</label>
          <textarea id="obj-new-prompt" rows="2"
            placeholder="${this._createMode === 'generate'
              ? 'Ex: Mercedes Classe S noire brillante, vue 3/4 avant, éclairage studio, fond blanc épuré, photorealistic...'
              : 'Ex: même angle, fond blanc... (optionnel)'}"></textarea>
        </div>

        ${this._createMode === 'upload' ? `
        <div class="upload-zone" id="obj-upload-zone" onclick="document.getElementById('obj-file').click()">
          <div class="upload-zone-icon">⬡</div>
          <div class="upload-zone-text">Photo de l'objet</div>
          <div class="upload-zone-hint">L'IA régénère l'objet en conservant son apparence</div>
        </div>
        <input type="file" id="obj-file" accept="image/*" style="display:none" />
        ` : `<input type="file" id="obj-file" accept="image/*" style="display:none" />`}

        <!-- Presets rapides -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;margin-top:10px">
          ${[
            ['Voiture de luxe noire', 'Mercedes Classe S noire brillante, vue 3/4 avant, studio lighting, fond blanc, photorealistic'],
            ['iPhone Pro doré',       'iPhone 16 Pro doré, vue de face légèrement inclinée, fond blanc épuré, product photography'],
            ['Chaîne en or',          'Grosse chaîne en or jaune, 10mm, fond noir velours, éclairage bijouterie, photorealistic'],
            ['Montre de luxe',        'Montre Rolex Submariner noire, vue de face, fond blanc, bijouterie professionnelle'],
            ['Jet privé intérieur',   'Intérieur de jet privé luxueux, sièges en cuir beige, éclairage ambiance, vue siège'],
          ].map(([label, prompt]) => `
            <button class="pill pill-accent" style="cursor:pointer;font-size:9px"
                    onclick="ModuleObjects.setPreset('${escHtml(label)}', \`${escHtml(prompt)}\`)">${label}</button>
          `).join('')}
        </div>

        <div class="btn-row">
          <button class="btn btn-primary btn-sm" onclick="ModuleObjects.generateObject()">⚡ Générer</button>
        </div>
        <div id="obj-gen-progress" style="display:none;margin-top:8px">
          <div class="shot-progress"><div class="shot-progress-bar" id="obj-prog-bar" style="width:0%"></div></div>
          <div class="text-muted text-small" id="obj-gen-status" style="margin-top:4px">Génération...</div>
        </div>
      </div>

      ${objects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">⬡</div>
          <div class="empty-state-text">Aucun objet créé</div>
        </div>
      ` : `
        <div class="media-grid">
          ${objects.map((o, i) => this.renderObjectCard(o, i)).join('')}
        </div>
      `}
    `;
  },

  renderObjectCard(obj, index) {
    const isGenerating = obj.generating;
    return `
      <div class="media-card" style="display:flex;flex-direction:column;${obj.locked ? 'border:1px solid rgba(34,197,94,0.5)' : ''}">
        ${obj.locked ? '<div class="media-locked-overlay">✓ VALIDÉ</div>' : ''}
        ${obj.imageUrl
          ? `<img src="${obj.imageUrl}" alt="${escHtml(obj.name)}" loading="lazy" style="aspect-ratio:1/1;object-fit:cover;width:100%" />`
          : isGenerating
            ? `<div style="aspect-ratio:1/1;background:var(--bg-3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px"><span style="font-size:20px">⏳</span><span style="font-size:9px;color:var(--text-3);font-family:var(--font-mono)">GÉNÉRATION...</span></div>`
            : `<div style="aspect-ratio:1/1;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:28px">⬡</div>`
        }
        <div class="media-card-info">
          <div class="media-card-name">${escHtml(obj.name)}</div>
          <div class="text-muted text-small" style="font-size:9px">${escHtml((obj.description || '').substring(0, 40))}</div>
        </div>
        ${!isGenerating ? `
        <div class="card-actions-bar">
          <button class="btn-validate-media ${obj.locked ? 'is-validated' : ''}"
                  onclick="ModuleObjects.toggleLock(${index})"
                  title="${obj.locked ? 'Déverrouiller' : 'Valider et télécharger'}">
            ${obj.locked ? '🔒 VALIDÉ' : '✓ VALIDER'}
          </button>
          ${obj.imageUrl && !obj.locked ? `
          <button class="btn-regen-media"
                  onclick="ModuleObjects.regenerate(${index})"
                  title="Régénérer cet objet">↺ REGEN</button>
          ` : ''}
          ${obj.imageUrl && obj.locked ? `
          <button class="btn-download-media" onclick="ModuleObjects.download(${index})" title="Télécharger">⬇</button>
          ` : ''}
          <button class="btn-del-media" onclick="ModuleObjects.remove(${index})" title="Supprimer">✕</button>
        </div>
        ` : ''}
      </div>
    `;
  },

  setPreset(name, prompt) {
    const nameEl   = document.getElementById('obj-new-name');
    const promptEl = document.getElementById('obj-new-prompt');
    if (nameEl)   nameEl.value   = name;
    if (promptEl) promptEl.value = prompt;
  },

  async generateObject() {
    const name     = document.getElementById('obj-new-name')?.value.trim();
    const category = document.getElementById('obj-new-category')?.value || 'other';
    const desc     = document.getElementById('obj-new-prompt')?.value.trim();

    if (!name) { Toast.error('Donnez un nom à l\'objet'); return; }
    if (!desc)  { Toast.error('Décrivez l\'objet pour la génération'); return; }

    const progDiv    = document.getElementById('obj-gen-progress');
    const progBar    = document.getElementById('obj-prog-bar');
    const progStatus = document.getElementById('obj-gen-status');
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '0%';
    if (progStatus) progStatus.textContent = 'Génération nano-banana-pro...';

    const p = State.currentProject();
    p.objects = p.objects || [];
    const objIndex = p.objects.length;
    p.objects.push({ id: `obj_${Date.now()}`, name, category, description: desc, imageUrl: null, generating: true, locked: false });
    State.save();
    this.render();

    const fileInput   = document.getElementById('obj-file');
    const imageInputs = [];
    if (fileInput?.files?.[0]) {
      const b64 = await Downloader.fileToBase64(fileInput.files[0]);
      imageInputs.push(b64);
      if (fileInput) fileInput.value = '';
    }

    const prompt = `${desc}, photorealistic, high quality, professional product photography, sharp focus`;

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs, aspectRatio: '1:1', resolution: '2K' },
        (pct) => {
          if (progBar) progBar.style.width = pct + '%';
          if (progStatus) progStatus.textContent = pct < 50 ? 'Génération...' : 'Finalisation...';
        }
      );

      const pUp = State.currentProject();
      if (pUp.objects?.[objIndex]) {
        pUp.objects[objIndex].imageUrl   = imageUrl;
        pUp.objects[objIndex].generating = false;
        State.save();
      }

      document.getElementById('obj-new-name').value   = '';
      document.getElementById('obj-new-prompt').value = '';
      Toast.success(`"${name}" généré ✓`);

    } catch (e) {
      const pUp = State.currentProject();
      if (pUp.objects?.[objIndex]) {
        pUp.objects[objIndex].generating = false;
        pUp.objects[objIndex].error      = true;
        State.save();
      }
      Toast.error(`Génération : ${e.message}`);
    }

    if (progDiv) progDiv.style.display = 'none';
    this.render();
    App.updateBadges();
  },

  toggleLock(index) {
    const p = State.currentProject();
    if (!p.objects?.[index]) return;
    const obj = p.objects[index];
    if (!obj.imageUrl && !obj.locked) { Toast.error('Générez d\'abord cet objet'); return; }

    obj.locked = !obj.locked;
    State.save();

    if (obj.locked) {
      Toast.success(`"${obj.name}" verrouillé ✓ — téléchargement en cours`);
      if (obj.imageUrl) Downloader.download(obj.imageUrl, `${obj.name}.jpg`);
    } else {
      Toast.info(`"${obj.name}" déverrouillé`);
    }

    this.render();
    App.updateBadges();
  },

  download(index) {
    const p = State.currentProject();
    if (!p.objects?.[index]?.imageUrl) return;
    Downloader.download(p.objects[index].imageUrl, `${p.objects[index].name}.jpg`);
  },

  remove(index) {
    const p = State.currentProject();
    if (!p.objects) return;
    if (p.objects[index]?.locked) { Toast.error('Déverrouillez d\'abord cet objet'); return; }
    p.objects.splice(index, 1);
    State.save();
    this.render();
    App.updateBadges();
  },

  // ── Régénérer un objet existant ──
  async regenerate(index) {
    const p = State.currentProject();
    if (!p.objects?.[index]) return;
    const obj = p.objects[index];
    if (obj.locked) { Toast.error('Déverrouillez d\'abord cet objet'); return; }

    const desc = obj.description;
    if (!desc) { Toast.error('Description manquante pour régénérer'); return; }

    obj.generating = true;
    obj.imageUrl   = null;
    State.save();
    this.render();

    try {
      const prompt   = `${desc}, photorealistic, high quality, professional product photography, sharp focus`;
      const imageUrl = await NanoBananaAPI.generateAndWait({ prompt, imageInputs: [], aspectRatio: '1:1', resolution: '2K' });

      const pUp = State.currentProject();
      if (pUp.objects?.[index]) {
        pUp.objects[index].imageUrl   = imageUrl;
        pUp.objects[index].generating = false;
        State.save();
      }
      Toast.success(`"${obj.name}" régénéré ✓`);
    } catch (e) {
      const pUp = State.currentProject();
      if (pUp.objects?.[index]) { pUp.objects[index].generating = false; State.save(); }
      Toast.error(`Régénération : ${e.message}`);
    }

    this.render();
    App.updateBadges();
  },
};
