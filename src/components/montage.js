/**
 * MODULE MONTAGE — Assemblage Shotstack + QC
 */

const ModuleMontage = {
  render() {
    const p = State.currentProject();
    if (!p) return;
    const el = document.getElementById('module-montage');
    const rushes    = p.rushes || [];
    const validated = rushes.filter(r => r.validated);
    const totalDuration = validated.reduce((a, r) => {
      const dur = (r.shots || []).reduce((b, s) => b + (s.duration || 5), 0);
      return a + dur;
    }, 0);

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Montage <span>Shotstack</span></div>
        <div class="module-desc">Assemblage automatique des shots validés selon les règles du Document Fondation 2026.</div>
      </div>

      ${!ShotstackAPI.isConfigured() ? `
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:14px;margin-bottom:20px;font-size:12px;color:var(--warning)">
          ⚠ Clé API Shotstack non configurée.
          <button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="App.goTo('settings')">Configurer →</button>
        </div>
      ` : ''}

      <!-- STATUT -->
      <div class="card">
        ${this.renderStatus(p)}
      </div>

      <!-- TIMELINE PREVIEW -->
      ${validated.length > 0 ? `
        <div class="card">
          <div class="card-title">Timeline — ${validated.length} shots · ${totalDuration.toFixed(1)}s</div>
          <div class="timeline-wrap">
            <div class="timeline">
              ${validated.map((r, i) => {
                const dur = (r.shots || []).reduce((a, s) => a + (s.duration || 5), 0);
                return `
                <div class="timeline-clip tl-validated" style="flex-basis:${totalDuration > 0 ? (dur / totalDuration * 100).toFixed(1) : 0}%;flex-grow:0"
                     title="${escHtml(r.name || '')} · ${dur}s">
                  <div>${i + 1}</div>
                  <div style="font-size:8px;margin-top:2px">${dur}s</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- PARAMÈTRES MONTAGE -->
      <div class="card">
        <div class="card-title">Paramètres d'export</div>
        <div class="field-row">
          <div class="field">
            <label>Résolution</label>
            <select id="mont-res">
              <option value="hd" selected>HD 720p</option>
              <option value="1080">Full HD 1080p</option>
            </select>
          </div>
          <div class="field">
            <label>Format</label>
            <select id="mont-format">
              <option value="mp4" selected>MP4 (H.264)</option>
              <option value="gif">GIF</option>
            </select>
          </div>
          <div class="field">
            <label>FPS</label>
            <select id="mont-fps">
              <option value="25" selected>25 fps</option>
              <option value="30">30 fps</option>
              <option value="24">24 fps</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>URL Bande-son (optionnel)</label>
          <input type="url" id="mont-sound" value="${escHtml(p.soundtrackUrl || '')}" placeholder="https://... (MP3 ou AAC)" />
        </div>
      </div>

      <!-- TEXT OVERLAYS -->
      ${this.renderTextOverlays(p)}

      <!-- END CARD -->
      ${this.renderEndCard(p)}

      <!-- QC CHECKLIST -->
      <div class="card">
        <div class="card-title">Check-list QC — Document Fondation §7</div>
        <div id="qc-list">
          ${PromptEngine.QC_CHECKLIST.map((item, i) => `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
              <input type="checkbox" id="qc-${i}" style="margin-top:2px;accent-color:var(--accent)" ${p._qc?.[i] ? 'checked' : ''} onchange="ModuleMontage.saveQC()" />
              <span style="font-size:12px;color:var(--text-1)">${item}</span>
            </label>
          `).join('')}
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-2)" id="qc-score">
          Score QC : <strong id="qc-count">0</strong> / ${PromptEngine.QC_CHECKLIST.length}
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="btn-row">
        ${validated.length === 0 ? `
          <div style="color:var(--text-3);font-size:12px">Validez au moins un shot pour lancer le montage.</div>
        ` : `
          <button class="btn btn-primary" onclick="ModuleMontage.startRender()">
            ▶ Lancer le montage Shotstack
          </button>
          ${p.montageUrl || p.montageBase64 ? `
            <button class="btn btn-ghost" onclick="Downloader.downloadMontage(State.currentProject())">
              ⬇ Télécharger le clip final
            </button>
          ` : ''}
        `}
      </div>
    `;

    this.updateQCScore();
  },

  // ── TEXT OVERLAYS ────────────────────────────────────────────────────

  renderTextOverlays(p) {
    const overlays = p.textOverlays || [];
    return `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title" style="margin:0">Textes à l'écran</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="ModuleMontage.autoOverlaysFromBlueprint()">⚡ Auto blueprint</button>
            <button class="btn btn-ghost btn-sm" onclick="ModuleMontage.addOverlay()">+ Ajouter</button>
          </div>
        </div>

        ${overlays.length === 0 ? `
          <div style="font-size:11px;color:var(--text-3);text-align:center;padding:16px">
            Aucun texte — clique "Auto blueprint" ou "+ Ajouter"
          </div>
        ` : overlays.map((ov, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-3);border-radius:6px;margin-bottom:6px">
            <input type="text" value="${escHtml(ov.text)}"
              style="flex:1;background:transparent;border:1px solid var(--border-mid);border-radius:4px;padding:4px 8px;color:var(--text-0);font-size:11px;font-family:var(--font-mono)"
              onchange="ModuleMontage.updateOverlay(${i},'text',this.value)" />
            <select onchange="ModuleMontage.updateOverlay(${i},'position',this.value)"
              style="background:var(--bg-2);border:1px solid var(--border);color:var(--text-1);padding:4px;border-radius:4px;font-size:10px;font-family:var(--font-mono)">
              <option value="top"    ${ov.position==='top'    ? 'selected':''}>Haut</option>
              <option value="center" ${ov.position==='center' ? 'selected':''}>Centre</option>
              <option value="bottom" ${ov.position==='bottom' ? 'selected':''}>Bas</option>
            </select>
            <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);white-space:nowrap">
              <input type="number" value="${ov.start}" min="0" step="0.5"
                style="width:40px;background:var(--bg-2);border:1px solid var(--border);color:var(--text-1);padding:2px 4px;border-radius:3px;font-size:9px;font-family:var(--font-mono);text-align:center"
                onchange="ModuleMontage.updateOverlay(${i},'start',+this.value)" />s
              <input type="number" value="${ov.duration}" min="1" step="0.5"
                style="width:36px;background:var(--bg-2);border:1px solid var(--border);color:var(--text-1);padding:2px 4px;border-radius:3px;font-size:9px;font-family:var(--font-mono);text-align:center;margin-left:4px"
                onchange="ModuleMontage.updateOverlay(${i},'duration',+this.value)" />s
            </div>
            <button style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:12px" onclick="ModuleMontage.removeOverlay(${i})">✕</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  addOverlay() {
    const p = State.currentProject();
    const overlays = [...(p.textOverlays || [])];
    overlays.push({ id: `ov_${Date.now()}`, text: 'Votre texte ici', start: 0, duration: 3, position: 'bottom', fontSize: 32, color: '#ffffff' });
    State.updateProject({ textOverlays: overlays });
    this.render();
  },

  removeOverlay(i) {
    const p = State.currentProject();
    const overlays = [...(p.textOverlays || [])];
    overlays.splice(i, 1);
    State.updateProject({ textOverlays: overlays });
    this.render();
  },

  updateOverlay(i, key, value) {
    const p = State.currentProject();
    const overlays = [...(p.textOverlays || [])];
    overlays[i] = { ...overlays[i], [key]: value };
    State.updateProject({ textOverlays: overlays });
  },

  autoOverlaysFromBlueprint() {
    const p = State.currentProject();
    const bp = p.intent;
    if (!bp) { Toast.error('Lance d\'abord un Auto Build'); return; }
    // Re-appliquer la génération des overlays (reset + regen)
    State.updateProject({ textOverlays: [] });
    AutoBuildEngine.apply(bp);
    Toast.success('Textes régénérés depuis le blueprint');
    this.render();
  },

  // ── END CARD ─────────────────────────────────────────────────────────

  renderEndCard(p) {
    const ec = p.endCard || {};
    return `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title" style="margin:0">End Card final</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" ${ec.enabled !== false ? 'checked' : ''}
              onchange="ModuleMontage.updateEndCard('enabled',this.checked)"
              style="accent-color:var(--accent)" />
            <span style="font-size:11px;color:var(--text-2)">Activer</span>
          </label>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div>
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);display:block;margin-bottom:4px">TITRE</label>
            <input type="text" value="${escHtml(ec.title||'')}" placeholder="AFAPE BALMA"
              style="width:100%;background:var(--bg-3);border:1px solid var(--border-mid);border-radius:4px;padding:6px 8px;color:var(--text-0);font-size:12px"
              onchange="ModuleMontage.updateEndCard('title',this.value)" />
          </div>
          <div>
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);display:block;margin-bottom:4px">SOUS-TITRE</label>
            <input type="text" value="${escHtml(ec.subtitle||'')}" placeholder="Activités pour grandir ensemble"
              style="width:100%;background:var(--bg-3);border:1px solid var(--border-mid);border-radius:4px;padding:6px 8px;color:var(--text-0);font-size:12px"
              onchange="ModuleMontage.updateEndCard('subtitle',this.value)" />
          </div>
        </div>

        <!-- Lignes de contact -->
        <div style="margin-bottom:12px">
          <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);display:block;margin-bottom:4px">LIGNES DE CONTACT (une par ligne)</label>
          <textarea rows="4"
            style="width:100%;background:var(--bg-3);border:1px solid var(--border-mid);border-radius:4px;padding:6px 8px;color:var(--text-1);font-size:11px;font-family:var(--font-mono);resize:vertical"
            onchange="ModuleMontage.updateEndCard('lines',this.value.split('\\n').filter(l=>l.trim()))"
            >${escHtml((ec.lines||[]).join('\n'))}</textarea>
        </div>

        <!-- Upload logo -->
        <div style="margin-bottom:12px">
          <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3);display:block;margin-bottom:6px">LOGO (optionnel)</label>
          <div style="display:flex;align-items:center;gap:10px">
            ${ec.logoBase64 ? `
              <img src="${ec.logoBase64}" style="height:48px;width:auto;border-radius:4px;border:1px solid var(--border-mid)" />
              <button class="btn btn-ghost btn-sm" onclick="ModuleMontage.removeLogo()">✕ Retirer</button>
            ` : `
              <label class="btn btn-ghost btn-sm" style="cursor:pointer">
                📎 Uploader logo
                <input type="file" accept="image/*" style="display:none" onchange="ModuleMontage.uploadLogo(event)" />
              </label>
            `}
            <select onchange="ModuleMontage.updateEndCard('logoPosition',this.value)"
              style="background:var(--bg-2);border:1px solid var(--border);color:var(--text-1);padding:4px 6px;border-radius:4px;font-size:10px;font-family:var(--font-mono)">
              <option value="top-center"  ${ec.logoPosition==='top-center'  ? 'selected':''}>Haut centré</option>
              <option value="top-left"    ${ec.logoPosition==='top-left'    ? 'selected':''}>Haut gauche</option>
              <option value="top-right"   ${ec.logoPosition==='top-right'   ? 'selected':''}>Haut droite</option>
            </select>
          </div>
        </div>

        <!-- Couleurs + durée -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3)">FOND</label>
            <input type="color" value="${ec.bgColor||'#F5F0E8'}" onchange="ModuleMontage.updateEndCard('bgColor',this.value)"
              style="width:28px;height:24px;border:1px solid var(--border-mid);border-radius:4px;cursor:pointer;padding:1px" />
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3)">TEXTE</label>
            <input type="color" value="${ec.textColor||'#1a1710'}" onchange="ModuleMontage.updateEndCard('textColor',this.value)"
              style="width:28px;height:24px;border:1px solid var(--border-mid);border-radius:4px;cursor:pointer;padding:1px" />
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3)">ACCENT</label>
            <input type="color" value="${ec.accentColor||'#B8922A'}" onchange="ModuleMontage.updateEndCard('accentColor',this.value)"
              style="width:28px;height:24px;border:1px solid var(--border-mid);border-radius:4px;cursor:pointer;padding:1px" />
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
            <label style="font-size:9px;font-family:var(--font-mono);color:var(--text-3)">DURÉE</label>
            <input type="number" value="${ec.duration||4}" min="2" max="8"
              style="width:44px;background:var(--bg-3);border:1px solid var(--border-mid);border-radius:4px;padding:4px;color:var(--text-0);font-size:11px;text-align:center"
              onchange="ModuleMontage.updateEndCard('duration',+this.value)" />
            <span style="font-size:9px;color:var(--text-3)">s</span>
          </div>
        </div>

        <!-- Preview end card -->
        <div style="margin-top:12px;background:${ec.bgColor||'#F5F0E8'};border-radius:8px;padding:16px;text-align:center;border:1px solid var(--border-mid)">
          ${ec.logoBase64 ? `<img src="${ec.logoBase64}" style="height:36px;width:auto;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto" />` : ''}
          <div style="font-size:15px;font-weight:800;color:${ec.textColor||'#1a1710'};font-family:var(--font-display)">${escHtml(ec.title||'TITRE')}</div>
          <div style="font-size:11px;color:${ec.accentColor||'#B8922A'};margin-top:3px">${escHtml(ec.subtitle||'Sous-titre')}</div>
          ${(ec.lines||[]).map(l => `<div style="font-size:9px;color:${ec.textColor||'#1a1710'};opacity:0.7;margin-top:2px;font-family:var(--font-mono)">${escHtml(l)}</div>`).join('')}
        </div>
      </div>
    `;
  },

  updateEndCard(key, value) {
    const p = State.currentProject();
    const ec = { ...(p.endCard || {}), [key]: value };
    State.updateProject({ endCard: ec });
    this.render();
  },

  uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.updateEndCard('logoBase64', e.target.result);
    };
    reader.readAsDataURL(file);
  },

  removeLogo() {
    this.updateEndCard('logoBase64', null);
  },

  renderStatus(p) {
    if (!p.montageStatus) return `
      <div class="montage-status-card">
        <div class="montage-big-icon">◈</div>
        <div class="montage-status-title">Prêt au montage</div>
        <div class="montage-status-desc">${(p.rushes || []).filter(r => r.validated).length} rush validé(s) prêt(s)</div>
      </div>
    `;

    if (p.montageStatus === 'rendering') return `
      <div class="montage-status-card">
        <div class="montage-big-icon">⏳</div>
        <div class="montage-status-title">Montage en cours...</div>
        <div class="montage-progress"><div class="montage-progress-bar" id="montage-progress-bar" style="width:${p._montageProgress || 10}%"></div></div>
        <div class="montage-status-desc">Job ID : ${p.montageJobId || '—'}</div>
      </div>
    `;

    if (p.montageStatus === 'done') return `
      <div class="montage-status-card">
        <div class="montage-big-icon">✓</div>
        <div class="montage-status-title" style="color:var(--locked)">Montage terminé !</div>
        <div class="montage-status-desc">${p.montageUrl ? `<a href="${p.montageUrl}" target="_blank" style="color:var(--accent)">Voir le clip →</a>` : 'Clip disponible en téléchargement'}</div>
        ${p.montageUrl ? `
          <video src="${p.montageUrl}" controls style="width:100%;max-width:480px;margin-top:12px;border-radius:8px"></video>
        ` : ''}
      </div>
    `;

    if (p.montageStatus === 'error') return `
      <div class="montage-status-card">
        <div class="montage-big-icon">✕</div>
        <div class="montage-status-title" style="color:var(--danger)">Erreur de montage</div>
        <div class="montage-status-desc">Vérifiez vos clés API et réessayez.</div>
      </div>
    `;
  },

  async startRender() {
    const p = State.currentProject();
    const validated = (p.rushes || []).filter(r => r.validated);
    if (validated.length === 0) { Toast.error('Aucun rush validé'); return; }

    // Sauvegarder paramètres
    State.updateProject({
      soundtrackUrl: document.getElementById('mont-sound').value.trim() || null,
    });

    State.updateMontage({ montageStatus: 'rendering', _montageProgress: 5 });
    this.render();

    try {
      const url = await ShotstackAPI.renderAndWait(p, (pct) => {
        State.updateMontage({ _montageProgress: pct });
        const bar = document.getElementById('montage-progress-bar');
        if (bar) bar.style.width = pct + '%';
      });

      State.updateMontage({ montageStatus: 'done', montageUrl: url });
      Toast.success('🎬 Montage terminé !');

      // Auto-téléchargement
      if (url) await Downloader.downloadMontage(State.currentProject());

    } catch (e) {
      State.updateMontage({ montageStatus: 'error' });
      Toast.error(`Montage: ${e.message}`);
    }

    this.render();
    App.updateBadges();
  },

  saveQC() {
    const checked = {};
    PromptEngine.QC_CHECKLIST.forEach((_, i) => {
      checked[i] = document.getElementById(`qc-${i}`)?.checked || false;
    });
    State.updateProject({ _qc: checked });
    this.updateQCScore();
  },

  updateQCScore() {
    const p = State.currentProject();
    const count = Object.values(p?._qc || {}).filter(Boolean).length;
    const el = document.getElementById('qc-count');
    if (el) el.textContent = count;
  },
};
