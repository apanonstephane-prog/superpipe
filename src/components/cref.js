/**
 * MODULE CREF — Personnages (Character Reference)
 *
 * Workflow :
 *  Mode A — Avec photo réelle :
 *    Upload photo → générer tenues → verrouiller → générer dans lieu
 *
 *  Mode B — Créer de zéro (NOUVEAU) :
 *    Prompter la description du personnage (physique, âge, style, origine…)
 *    → nano-banana-pro génère le portrait de base
 *    → ce portrait devient la référence pour les tenues
 *    → même workflow ensuite (tenues → lieux → compositions)
 *
 * Règle : seules les images verrouillées sont téléchargées et injectées dans Kling 3.
 */

const ModuleCRef = {

  _createMode: 'upload',   // 'upload' | 'create'

  setCreateMode(mode) {
    this._createMode = mode;
    // Toggler les panneaux sans re-render complet
    const u = document.getElementById('cref-panel-upload');
    const c = document.getElementById('cref-panel-create');
    const btnU = document.getElementById('cref-tab-upload');
    const btnC = document.getElementById('cref-tab-create');
    if (u) u.style.display = mode === 'upload' ? 'block' : 'none';
    if (c) c.style.display = mode === 'create' ? 'block' : 'none';
    if (btnU) btnU.className = `cref-tab-btn${mode === 'upload' ? ' active' : ''}`;
    if (btnC) btnC.className = `cref-tab-btn${mode === 'create' ? ' active' : ''}`;
  },

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-cref');
    const lockedCount = (p.characters || []).filter(c => c.locked).length;

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Personnages <span>CRef</span></div>
        <div class="module-desc">
          Créez des personnages <strong>depuis une photo réelle</strong> ou <strong>de zéro via un prompt</strong>.
          Nano Banana Pro génère les tenues. Verrouillez les meilleures — elles deviennent les références Kling 3.
        </div>
      </div>

      ${lockedCount > 0 ? `<div style="margin-bottom:16px"><span class="lock-badge">${lockedCount} personnage${lockedCount > 1 ? 's' : ''} verrouillé${lockedCount > 1 ? 's' : ''}</span></div>` : ''}

      <!-- ══ CRÉATION PERSONNAGE ══ -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title" style="margin:0">Ajouter un personnage</div>
          <!-- Tabs mode -->
          <div style="display:flex;gap:4px;background:var(--bg-3);border-radius:8px;padding:3px">
            <button class="cref-tab-btn active" id="cref-tab-upload" onclick="ModuleCRef.setCreateMode('upload')">
              📸 Photo réelle
            </button>
            <button class="cref-tab-btn" id="cref-tab-create" onclick="ModuleCRef.setCreateMode('create')">
              ✦ Créer de zéro
            </button>
          </div>
        </div>

        <!-- Nom commun aux deux modes -->
        <div class="field">
          <label>Nom / rôle du personnage</label>
          <input type="text" id="cref-new-name" placeholder="Ex : Artiste principal, Antagoniste, Héroïne…" />
        </div>

        <!-- ── MODE UPLOAD ── -->
        <div id="cref-panel-upload">
          <div class="upload-zone" id="cref-upload-zone" onclick="document.getElementById('cref-file').click()">
            <div class="upload-zone-icon">◉</div>
            <div class="upload-zone-text">Photo normale du personnage</div>
            <div class="upload-zone-hint">JPG, PNG, WEBP — visage net, corps visible de préférence</div>
          </div>
          <input type="file" id="cref-file" accept="image/*" onchange="ModuleCRef.handleUpload(event)" style="display:none" />
        </div>

        <!-- ── MODE CRÉER DE ZÉRO ── -->
        <div id="cref-panel-create" style="display:none">

          <!-- Presets genre / style -->
          <div style="margin-bottom:10px">
            <div class="text-muted text-small" style="margin-bottom:6px;font-family:var(--font-mono)">STYLE VISUEL</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap" id="cref-style-chips">
              ${['Photoréaliste', 'Cinéma 4K', 'Illustration', 'Manga/Anime', 'Fantasy', '3D CGI'].map(s => `
                <button class="chip-btn" onclick="ModuleCRef.toggleStyleChip(this, '${s}')">${s}</button>
              `).join('')}
            </div>
          </div>

          <!-- Presets genre -->
          <div style="margin-bottom:10px">
            <div class="text-muted text-small" style="margin-bottom:6px;font-family:var(--font-mono)">GENRE</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap" id="cref-gender-chips">
              ${['Homme', 'Femme', 'Non-binaire'].map((g, i) => `
                <button class="chip-btn${i === 0 ? ' selected' : ''}" onclick="ModuleCRef.selectGenderChip(this, '${g}')">${g}</button>
              `).join('')}
            </div>
          </div>

          <!-- Prompt détaillé -->
          <div class="field" style="margin-bottom:8px">
            <label>Description du personnage</label>
            <textarea id="cref-create-prompt" rows="5"
              placeholder="Écrivez en texte naturel — pas de JSON, pas de liste à puces.&#10;&#10;Exemple : homme 35 ans afro-caribéen martiniquais, carrure athlétique, peau sombre, lunettes noires opaques, chemise sécurité noire ajustée, oreillette discrète, expression ultra-sérieuse autorité absolue, entrée boîte de nuit Martinique nuit tropicale, lumière chaude de l'entrée, qualité photo publicitaire premium, réalisme cinématographique, pas de texte, pas de cartoon"></textarea>
          </div>

          <!-- Presets de personnages -->
          <div style="margin-bottom:12px">
            <div class="text-muted text-small" style="margin-bottom:6px;font-family:var(--font-mono)">EXEMPLES RAPIDES</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${[
                ['Artiste urbain', 'man 25 years old, mixed race, strong jawline, dark eyes, short twisted hair, athletic build, confident intense gaze, streetwear oversized hoodie, gold chain, neutral studio background'],
                ['Héroïne film', 'woman 30 years old, mediterranean complexion, sharp features, dark wavy hair, lean athletic figure, determined expression, sleek dark outfit, dramatic lighting'],
                ['Villain charismatique', 'man 40 years old, pale skin, sharp angular face, piercing cold eyes, slicked back dark hair, tall imposing figure, expensive dark suit, calm menacing expression'],
                ['Artiste pop', 'woman 22 years old, east asian features, expressive eyes, colorful dyed hair, slender figure, playful confident expression, modern colorful fashion, white studio background'],
              ].map(([name, preset]) => `
                <button class="chip-btn chip-preset"
                  onclick="document.getElementById('cref-create-prompt').value = '${preset.replace(/'/g, "\\'")}'">
                  ${name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Paramètres de génération -->
          <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:120px;margin:0">
              <label>Format portrait</label>
              <select id="cref-create-aspect">
                <option value="9:16">9:16 — Vertical (stories)</option>
                <option value="2:3" selected>2:3 — Portrait</option>
                <option value="3:4">3:4 — Portrait large</option>
                <option value="1:1">1:1 — Carré</option>
                <option value="4:3">4:3 — Paysage standard</option>
                <option value="3:2">3:2 — Paysage photo</option>
                <option value="16:9">16:9 — Cinéma / widescreen</option>
              </select>
            </div>
            <div class="field" style="flex:1;min-width:120px;margin:0">
              <label>Résolution</label>
              <select id="cref-create-res">
                <option value="2K" selected>2K</option>
                <option value="4K">4K (plus lent)</option>
                <option value="1K">1K (rapide)</option>
              </select>
            </div>
          </div>

          <!-- Bouton générer -->
          <button class="btn btn-primary" style="width:100%" onclick="ModuleCRef.generateBasePortrait()">
            ✦ Générer le personnage
          </button>
          <div id="cref-create-progress" style="display:none;margin-top:10px">
            <div class="shot-progress"><div class="shot-progress-bar" id="cref-create-prog-bar" style="width:0%"></div></div>
            <div class="text-muted text-small" id="cref-create-prog-label" style="margin-top:4px;font-family:var(--font-mono)">
              Génération en cours…
            </div>
          </div>
        </div>
      </div>

      <!-- ══ LISTE DES PERSONNAGES ══ -->
      ${(p.characters || []).length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">◉</div>
          <div class="empty-state-text">Aucun personnage — uploadez une photo ou créez-en un de zéro</div>
        </div>
      ` : (p.characters || []).map(c => this.renderCharSection(c)).join('')}
    `;

    this.setupDragDrop();
    // Restaurer le mode actif
    if (this._createMode === 'create') this.setCreateMode('create');
  },

  // ── Chips helpers ──
  toggleStyleChip(btn, value) {
    btn.classList.toggle('selected');
  },

  selectGenderChip(btn, value) {
    document.querySelectorAll('#cref-gender-chips .chip-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  _getSelectedStyleChips() {
    return [...document.querySelectorAll('#cref-style-chips .chip-btn.selected')].map(b => b.textContent.trim());
  },

  _getSelectedGender() {
    const sel = document.querySelector('#cref-gender-chips .chip-btn.selected');
    return sel ? sel.textContent.trim() : 'person';
  },

  // ── GÉNÉRER UN PORTRAIT DE ZÉRO ──
  async generateBasePortrait() {
    const nameEl   = document.getElementById('cref-new-name');
    const promptEl = document.getElementById('cref-create-prompt');
    const aspectEl = document.getElementById('cref-create-aspect');
    const resEl    = document.getElementById('cref-create-res');

    const name   = nameEl?.value.trim();
    const desc   = promptEl?.value.trim();
    if (!name) { Toast.error('Donnez un nom au personnage'); nameEl?.focus(); return; }
    if (!desc) { Toast.error('Décrivez le personnage — physique, style, expression…'); promptEl?.focus(); return; }

    const styles = this._getSelectedStyleChips();
    const gender = this._getSelectedGender();
    const aspect = aspectEl?.value || '2:3';
    const res    = resEl?.value    || '2K';

    // Le prompt = exactement ce que l'utilisateur a écrit
    // + style chips si sélectionnés (en suffixe léger)
    const styleKeywords = styles.length > 0 ? styles.join(', ').toLowerCase() : '';
    const fullPrompt = styleKeywords
      ? `${desc}, style: ${styleKeywords}`
      : desc;

    // UI progress
    const progDiv = document.getElementById('cref-create-progress');
    const progBar = document.getElementById('cref-create-prog-bar');
    const progLbl = document.getElementById('cref-create-prog-label');
    const btn     = document.querySelector('#cref-panel-create .btn-primary');
    if (btn)     btn.disabled = true;
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '5%';
    if (progLbl) progLbl.textContent = 'Nano Banana Pro génère le personnage…';

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt: fullPrompt, imageInputs: [], aspectRatio: aspect, resolution: res },
        (pct) => {
          if (progBar) progBar.style.width = pct + '%';
          if (progLbl) progLbl.textContent = pct < 40 ? 'Génération en cours…' : pct < 80 ? 'Rendu du personnage…' : 'Finalisation…';
        }
      );

      // Créer le personnage avec le portrait généré comme référence
      State.addCharacter({
        name,
        base64:       null,       // pas de photo uploadée
        generatedBase: imageUrl,  // portrait généré = référence
        promptBase:   desc,
        styleBase:    styles,
        type:         'generated',
      });

      if (nameEl)  nameEl.value  = '';
      if (promptEl) promptEl.value = '';
      document.querySelectorAll('#cref-style-chips .chip-btn').forEach(b => b.classList.remove('selected'));

      Toast.success(`✦ "${name}" créé — verrouillez-le ou générez ses tenues`);
      this._createMode = 'upload';
      this.render();
      App.updateBadges();

    } catch (e) {
      Toast.error(`Génération portrait : ${e.message}`);
    }

    if (btn)     btn.disabled = false;
    if (progDiv) progDiv.style.display = 'none';
  },

  renderCharSection(c) {
    const lockedTenues = (c.tenues || []).filter(t => t.locked && t.imageUrl);
    const lockedLieux  = (State.currentProject().locations || []).filter(l => l.locked);

    return `
      <div class="card" id="char-card-${c.id}" style="${c.locked ? 'border-color:rgba(34,197,94,0.4)' : ''}">

        <!-- Entête personnage -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          ${c.base64 || c.generatedBase
            ? `<div style="position:relative;flex-shrink:0">
                <img src="${c.base64 || c.generatedBase}"
                     style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);cursor:pointer"
                     title="Cliquer pour agrandir"
                     onclick="ModuleCRef.previewPortrait('${c.id}')" />
                ${c.type === 'generated' ? `<span style="position:absolute;bottom:-2px;right:-2px;background:var(--accent);color:#000;font-size:7px;font-weight:800;padding:1px 4px;border-radius:4px;font-family:var(--font-mono)">IA</span>` : ''}
              </div>`
            : `<div style="width:56px;height:56px;border-radius:50%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">◉</div>`
          }
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-weight:700;color:var(--text-0)">
              ${escHtml(c.name)}
              ${c.type === 'generated' ? `<span style="font-size:9px;color:var(--accent);font-family:var(--font-mono);margin-left:6px;font-weight:400">✦ créé par IA</span>` : ''}
            </div>
            <div class="text-muted text-small">${(c.tenues || []).length} tenue(s) · ${lockedTenues.length} verrouillée(s)</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${(c.base64 || c.generatedBase) ? `
              <button class="btn-download-media"
                      onclick="ModuleCRef.downloadPortrait('${c.id}')"
                      title="Télécharger le portrait">⬇</button>
            ` : ''}
            <button class="${c.locked ? 'btn-lock-media is-locked' : 'btn-lock-media'}"
                    onclick="ModuleCRef.toggleLock('${c.id}')"
                    title="${c.locked ? 'Déverrouiller' : 'Verrouiller ce personnage'}">${c.locked ? '🔒' : '🔓'}</button>
            <button class="btn-del-media" onclick="ModuleCRef.remove('${c.id}')">✕</button>
          </div>
        </div>

        <!-- Générer une tenue -->
        <div style="background:var(--bg-3);border-radius:8px;padding:12px;margin-bottom:16px">
          <div class="card-title" style="margin-bottom:8px;font-size:11px">⚡ GÉNÉRER UNE TENUE</div>
          <textarea id="tenue-prompt-${c.id}" rows="2"
            placeholder="Ex: streetwear noir, hoodie oversize, sneakers blanches, fond neutre studio..."></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="ModuleCRef.generateTenue('${c.id}')">⚡ Générer</button>
            <button class="btn btn-ghost btn-sm"   onclick="ModuleCRef.generateAllTenues('${c.id}')">⚡⚡ 3 tenues auto</button>
          </div>
          <div id="tenue-gen-progress-${c.id}" style="display:none;margin-top:8px">
            <div class="shot-progress"><div class="shot-progress-bar" id="tenue-prog-bar-${c.id}" style="width:0%"></div></div>
            <div class="text-muted text-small" id="tenue-gen-status-${c.id}" style="margin-top:4px">Génération...</div>
          </div>
        </div>

        <!-- Tenues générées -->
        ${(c.tenues || []).length > 0 ? `
          <div class="card-title" style="margin-bottom:8px;font-size:11px">TENUES GÉNÉRÉES</div>
          <div class="media-grid" style="margin-bottom:${lockedLieux.length > 0 && lockedTenues.length > 0 ? '16px' : '0'}">
            ${(c.tenues || []).map((t, i) => this.renderTenueCard(c.id, t, i)).join('')}
          </div>
        ` : ''}

        <!-- Personnage dans un lieu -->
        ${(c.base64 || c.generatedBase) && lockedLieux.length > 0 ? `
          <div style="background:var(--bg-3);border-radius:8px;padding:12px">
            <div class="card-title" style="margin-bottom:8px;font-size:11px">◈ PERSONNAGE DANS UN LIEU</div>
            <div class="field-row" style="margin-bottom:8px">
              <div class="field" style="margin:0">
                <label>Lieu</label>
                <select id="lieu-select-${c.id}">
                  ${lockedLieux.map(l => `<option value="${l.id}">${escHtml(l.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <textarea id="action-prompt-${c.id}" rows="2"
              placeholder="Ex: marche dans la rue, regarde la caméra, bras croisés, pose décontractée..."></textarea>
            <button class="btn btn-primary btn-sm" style="margin-top:8px"
                    onclick="ModuleCRef.generateInLieu('${c.id}')">⚡ Générer la composition</button>
          </div>
        ` : ''}

      </div>
    `;
  },

  renderTenueCard(charId, tenue, index) {
    const isGenerating = tenue.generating;
    return `
      <div class="media-card" style="display:flex;flex-direction:column;${tenue.locked ? 'border:1px solid rgba(34,197,94,0.5)' : ''}">
        ${tenue.locked ? '<div class="media-locked-overlay">✓ VALIDÉ</div>' : ''}
        ${tenue.imageUrl
          ? `<img src="${tenue.imageUrl}" alt="Tenue ${index + 1}" loading="lazy" style="aspect-ratio:2/3;object-fit:cover;width:100%;flex:1" />`
          : isGenerating
            ? `<div style="aspect-ratio:2/3;background:var(--bg-3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;flex:1"><span style="font-size:20px">⏳</span><span style="font-size:9px;color:var(--text-3);font-family:var(--font-mono)">GÉNÉRATION...</span></div>`
            : `<div style="aspect-ratio:2/3;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:24px;flex:1">◉</div>`
        }
        <div class="media-card-info">
          <div class="media-card-name" style="font-size:9px;line-height:1.3">${escHtml((tenue.description || '').substring(0, 40))}${tenue.isComposition ? ' 📍' : ''}</div>
        </div>
        ${!isGenerating ? `
        <div class="card-actions-bar">
          <button class="btn-validate-media ${tenue.locked ? 'is-validated' : ''}"
                  onclick="ModuleCRef.toggleTenueLock('${charId}', ${index})"
                  title="${tenue.locked ? 'Déverrouiller' : 'Valider et télécharger'}">
            ${tenue.locked ? '🔒 VALIDÉ' : '✓ VALIDER'}
          </button>
          ${tenue.imageUrl && !tenue.locked ? `
          <button class="btn-regen-media"
                  onclick="ModuleCRef.regenerateTenue('${charId}', ${index})"
                  title="Régénérer cette tenue">↺ REGEN</button>
          ` : ''}
          ${tenue.imageUrl && tenue.locked ? `
          <button class="btn-download-media" onclick="ModuleCRef.downloadTenue('${charId}', ${index})" title="Télécharger">⬇</button>
          ` : ''}
          <button class="btn-del-media" onclick="ModuleCRef.removeTenue('${charId}', ${index})" title="Supprimer">✕</button>
        </div>
        ` : ''}
      </div>
    `;
  },

  // ── Upload photo de référence ──
  async handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const name   = document.getElementById('cref-new-name').value.trim() || file.name.replace(/\.[^.]+$/, '');
    const base64 = await Downloader.fileToBase64(file);
    State.addCharacter({ name, base64, type: file.type });
    document.getElementById('cref-new-name').value = '';
    event.target.value = '';
    Toast.success(`Personnage "${name}" ajouté`);
    this.render();
    App.updateBadges();
  },

  // ── Générer une tenue ──
  async generateTenue(charId) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c) return;

    const promptEl   = document.getElementById(`tenue-prompt-${charId}`);
    const desc       = promptEl?.value.trim();
    if (!desc) { Toast.error('Décrivez la tenue à générer'); return; }

    const progDiv    = document.getElementById(`tenue-gen-progress-${charId}`);
    const progBar    = document.getElementById(`tenue-prog-bar-${charId}`);
    const progStatus = document.getElementById(`tenue-gen-status-${charId}`);
    if (progDiv) progDiv.style.display = 'block';
    if (progBar) progBar.style.width = '0%';
    if (progStatus) progStatus.textContent = 'Génération nano-banana-pro...';

    c.tenues = c.tenues || [];
    const tenueIndex = c.tenues.length;
    c.tenues.push({ description: desc, imageUrl: null, generating: true, locked: false });
    State.save();
    this.render();

    try {
      const prompt      = `Full body portrait of a person, ${desc}, clean neutral background, professional photo, high quality, same person consistent appearance`;
      // Utiliser la photo réelle OU le portrait généré comme référence
      const refImg      = c.base64 || c.generatedBase || null;
      const imageInputs = refImg ? [refImg] : [];

      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs, aspectRatio: '2:3', resolution: '2K' },
        (pct) => {
          if (progBar) progBar.style.width = pct + '%';
          if (progStatus) progStatus.textContent = pct < 50 ? 'Génération en cours...' : 'Finalisation...';
        }
      );

      const pUp = State.currentProject();
      const cUp = pUp.characters.find(c => c.id === charId);
      if (cUp?.tenues?.[tenueIndex]) {
        cUp.tenues[tenueIndex].imageUrl   = imageUrl;
        cUp.tenues[tenueIndex].generating = false;
        State.save();
      }

      if (promptEl) promptEl.value = '';
      Toast.success('Tenue générée ✓');

    } catch (e) {
      const pUp = State.currentProject();
      const cUp = pUp.characters.find(c => c.id === charId);
      if (cUp?.tenues?.[tenueIndex]) {
        cUp.tenues[tenueIndex].generating = false;
        cUp.tenues[tenueIndex].error = true;
        State.save();
      }
      Toast.error(`Génération : ${e.message}`);
    }

    if (progDiv) progDiv.style.display = 'none';
    this.render();
    App.updateBadges();
  },

  // ── Générer 3 tenues automatiquement ──
  async generateAllTenues(charId) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c?.base64 && !c?.generatedBase) {
      Toast.error('Ajoutez d\'abord une photo ou créez le personnage de zéro');
      return;
    }

    const defaults = [
      'Tenue 1 — streetwear urbain moderne, casual, fond blanc neutre',
      'Tenue 2 — tenue de soirée élégante, luxe sobre, fond noir neutre',
      'Tenue 3 — tenue de performance scène, impactante, fond studio gris',
    ];

    Toast.info('Génération de 3 tenues en cours...');

    for (const desc of defaults) {
      const promptEl = document.getElementById(`tenue-prompt-${charId}`);
      if (promptEl) promptEl.value = desc;
      await this.generateTenue(charId);
    }

    Toast.success('3 tenues générées — verrouillez les meilleures');
  },

  // ── Générer personnage dans un lieu ──
  async generateInLieu(charId) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c) return;

    const lieuSelectEl   = document.getElementById(`lieu-select-${charId}`);
    const actionPromptEl = document.getElementById(`action-prompt-${charId}`);
    if (!lieuSelectEl || !actionPromptEl) return;

    const lieuId = lieuSelectEl.value;
    const action = actionPromptEl.value.trim();
    if (!action) { Toast.error('Décrivez l\'action du personnage'); return; }

    const lieu = p.locations.find(l => l.id === lieuId);
    if (!lieu) return;

    const lockedTenue = (c.tenues || []).find(t => t.locked && t.imageUrl);
    const imageInputs = [];
    if (lockedTenue?.imageUrl)  imageInputs.push(lockedTenue.imageUrl);
    else if (c.base64)          imageInputs.push(c.base64);
    else if (c.generatedBase)   imageInputs.push(c.generatedBase);

    const lieuImg = lieu.imageUrl || lieu.base64;
    if (lieuImg) imageInputs.push(lieuImg);

    const prompt = `${c.name} ${action}, in ${lieu.name}${lieu.mood ? ', ' + lieu.mood : ''}, professional photo, same person, same location, consistent appearance`;

    Toast.info('Génération de la composition en cours...');

    try {
      const imageUrl = await NanoBananaAPI.generateAndWait(
        { prompt, imageInputs, aspectRatio: '16:9', resolution: '2K' }
      );

      const pUp = State.currentProject();
      const cUp = pUp.characters.find(c => c.id === charId);
      cUp.tenues = cUp.tenues || [];
      cUp.tenues.push({
        description:   `${action} — ${lieu.name}`,
        imageUrl,
        generating:    false,
        locked:        false,
        isComposition: true,
      });
      State.save();
      Toast.success('Composition générée ✓');

    } catch (e) {
      Toast.error(`Génération : ${e.message}`);
    }

    this.render();
    App.updateBadges();
  },

  // ── Verrouiller/déverrouiller une tenue ──
  toggleTenueLock(charId, index) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c || !c.tenues?.[index]) return;

    const tenue = c.tenues[index];
    if (!tenue.imageUrl && !tenue.locked) { Toast.error('Générez d\'abord cette tenue'); return; }

    tenue.locked = !tenue.locked;
    State.save();

    if (tenue.locked) {
      Toast.success('Tenue verrouillée ✓ — téléchargement en cours');
      if (tenue.imageUrl) Downloader.download(tenue.imageUrl, `${c.name}_tenue_${index + 1}.jpg`);
    } else {
      Toast.info('Tenue déverrouillée');
    }

    this.render();
    App.updateBadges();
  },

  downloadTenue(charId, index) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c?.tenues?.[index]?.imageUrl) return;
    Downloader.download(c.tenues[index].imageUrl, `${c.name}_tenue_${index + 1}.jpg`);
  },

  removeTenue(charId, index) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c) return;
    c.tenues.splice(index, 1);
    State.save();
    this.render();
  },

  // ── Régénérer une tenue existante ──
  async regenerateTenue(charId, index) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === charId);
    if (!c?.tenues?.[index]) return;

    const tenue = c.tenues[index];
    if (tenue.locked) { Toast.error('Déverrouillez d\'abord cette tenue'); return; }

    const desc = tenue.description;
    if (!desc) { Toast.error('Description manquante pour régénérer'); return; }

    tenue.generating = true;
    tenue.imageUrl   = null;
    State.save();
    this.render();

    try {
      const prompt      = `Full body portrait of a person, ${desc}, clean neutral background, professional photo, high quality, same person consistent appearance`;
      const refImg      = c.base64 || c.generatedBase || null;
      const imageInputs = refImg ? [refImg] : [];
      const imageUrl    = await NanoBananaAPI.generateAndWait({ prompt, imageInputs, aspectRatio: '2:3', resolution: '2K' });

      const pUp = State.currentProject();
      const cUp = pUp.characters.find(c => c.id === charId);
      if (cUp?.tenues?.[index]) {
        cUp.tenues[index].imageUrl   = imageUrl;
        cUp.tenues[index].generating = false;
        State.save();
      }
      Toast.success('Tenue régénérée ✓');
    } catch (e) {
      const pUp = State.currentProject();
      const cUp = pUp.characters.find(c => c.id === charId);
      if (cUp?.tenues?.[index]) { cUp.tenues[index].generating = false; State.save(); }
      Toast.error(`Régénération : ${e.message}`);
    }

    this.render();
  },

  // ── Verrouiller/déverrouiller le personnage ──
  toggleLock(id) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === id);
    if (!c) return;

    const hasLockedTenue = (c.tenues || []).some(t => t.locked && t.imageUrl);
    if (!c.locked && !hasLockedTenue && !c.base64 && !c.generatedBase) {
      Toast.error('Verrouillez au moins une tenue générée avant de verrouiller le personnage');
      return;
    }

    State.lockCharacter(id, !c.locked);
    Toast[!c.locked ? 'success' : 'info'](!c.locked ? `🔒 ${c.name} verrouillé` : `🔓 ${c.name} déverrouillé`);
    this.render();
    App.updateBadges();
  },

  remove(id) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === id);
    if (c?.locked) { Toast.error('Déverrouillez d\'abord ce personnage'); return; }
    State.removeCharacter(id);
    this.render();
    App.updateBadges();
  },

  // ── Aperçu plein écran du portrait ──
  previewPortrait(id) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === id);
    if (!c) return;
    const src = c.base64 || c.generatedBase;
    if (!src) return;
    // Ouvre dans une nouvelle fenêtre pour un aperçu plein écran
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${c.name}</title>
      <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}
      img{max-width:100vw;max-height:100vh;object-fit:contain}</style></head>
      <body><img src="${src}" alt="${c.name}" /></body></html>`);
    w.document.close();
  },

  // ── Télécharger le portrait de base ──
  async downloadPortrait(id) {
    const p = State.currentProject();
    const c = p.characters.find(c => c.id === id);
    if (!c) return;
    const src = c.base64 || c.generatedBase;
    if (!src) { Toast.error('Pas d\'image disponible'); return; }
    const safeName = (c.name || 'personnage').replace(/[^a-z0-9]/gi, '_');
    await Downloader.download(src, `${safeName}_portrait.jpg`);
  },

  setupDragDrop() {
    const zone = document.getElementById('cref-upload-zone');
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
        document.getElementById('cref-file').files = dt.files;
        ModuleCRef.handleUpload({ target: { files: dt.files } });
      }
    });
  },
};
