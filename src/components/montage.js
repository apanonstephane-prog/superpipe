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
