/**
 * MODULE SETTINGS — Configuration APIs
 */

const ModuleSettings = {
  render() {
    const cfg = State.getConfig();
    const el = document.getElementById('module-settings');
    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Config <span>&</span> APIs</div>
        <div class="module-desc">Toutes vos clés sont stockées localement dans votre navigateur. Elles ne transitent jamais par un serveur tiers.</div>
      </div>

      <div class="card">
        <div class="card-title">Kling AI — Génération vidéo</div>
        <div class="field">
          <label>Clé API Kling</label>
          <div class="api-field">
            <input type="password" id="cfg-kling-key" value="${cfg.klingApiKey || ''}" placeholder="sk-kling-..." autocomplete="off" />
            <button class="api-toggle" onclick="ModuleSettings.toggleVis('cfg-kling-key', this)">VOIR</button>
          </div>
          <div class="api-status">
            <div class="api-dot ${cfg.klingApiKey ? 'ok' : ''}" id="dot-kling"></div>
            <span id="status-kling">${cfg.klingApiKey ? 'Clé configurée' : 'Non configurée'}</span>
          </div>
        </div>
        <div class="field">
          <label>Endpoint Kling</label>
          <input type="text" id="cfg-kling-endpoint" value="${cfg.klingEndpoint || 'https://api.klingai.com/v1'}" />
        </div>
        <div class="field">
          <label>Modèle</label>
          <select id="cfg-kling-model">
            <option value="kling-v3" selected>Kling 3 (recommandé)</option>
            <option value="kling-v2">Kling 2</option>
          </select>
        </div>
        <p class="text-muted text-small mt-8">Obtenez votre clé sur <a href="https://klingai.com" target="_blank" style="color:var(--accent)">klingai.com</a> ou via Replicate. Entrez <code style="color:var(--accent)">MOCK</code> pour tester sans clé réelle.</p>
      </div>

      <div class="card">
        <div class="card-title">Shotstack — Montage automatique</div>
        <div class="field">
          <label>Clé API Shotstack</label>
          <div class="api-field">
            <input type="password" id="cfg-shotstack-key" value="${cfg.shotstackApiKey || ''}" placeholder="your-shotstack-key..." autocomplete="off" />
            <button class="api-toggle" onclick="ModuleSettings.toggleVis('cfg-shotstack-key', this)">VOIR</button>
          </div>
          <div class="api-status">
            <div class="api-dot ${cfg.shotstackApiKey ? 'ok' : ''}" id="dot-shotstack"></div>
            <span id="status-shotstack">${cfg.shotstackApiKey ? 'Clé configurée' : 'Non configurée'}</span>
          </div>
        </div>
        <div class="field">
          <label>Environnement</label>
          <select id="cfg-shotstack-env">
            <option value="stage" ${cfg.shotstackEnv !== 'production' ? 'selected' : ''}>Stage (test, filigrane)</option>
            <option value="production" ${cfg.shotstackEnv === 'production' ? 'selected' : ''}>Production</option>
          </select>
        </div>
        <p class="text-muted text-small mt-8">Obtenez votre clé sur <a href="https://shotstack.io" target="_blank" style="color:var(--accent)">shotstack.io</a>. Commencez en Stage pour les tests.</p>
      </div>

      <div class="card">
        <div class="card-title">Données & Sauvegarde</div>
        <div class="field-row">
          <div>
            <div class="text-mono text-small text-muted">Projets sauvegardés</div>
            <div style="font-size:24px;font-weight:800;color:var(--text-0);margin-top:4px" id="stat-projects">—</div>
          </div>
          <div>
            <div class="text-mono text-small text-muted">Shots générés</div>
            <div style="font-size:24px;font-weight:800;color:var(--text-0);margin-top:4px" id="stat-shots">—</div>
          </div>
          <div>
            <div class="text-mono text-small text-muted">Taille stockage</div>
            <div style="font-size:24px;font-weight:800;color:var(--text-0);margin-top:4px" id="stat-size">—</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="ModuleSettings.exportData()">📤 Exporter données</button>
          <button class="btn btn-ghost btn-sm" onclick="ModuleSettings.importData()">📥 Importer données</button>
          <button class="btn btn-danger btn-sm" onclick="ModuleSettings.clearAll()">🗑 Tout effacer</button>
        </div>
        <input type="file" id="import-file" accept=".json" onchange="ModuleSettings.doImport(event)" />
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="ModuleSettings.save()">✓ Sauvegarder la config</button>
      </div>
    `;
    this.updateStats();
  },

  toggleVis(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'MASQUER'; }
    else { input.type = 'password'; btn.textContent = 'VOIR'; }
  },

  save() {
    State.updateConfig({
      klingApiKey: document.getElementById('cfg-kling-key').value.trim(),
      klingEndpoint: document.getElementById('cfg-kling-endpoint').value.trim(),
      shotstackApiKey: document.getElementById('cfg-shotstack-key').value.trim(),
      shotstackEnv: document.getElementById('cfg-shotstack-env').value,
    });
    Toast.success('Configuration sauvegardée');
    this.render();
  },

  updateStats() {
    const projects = State.allProjects();
    const shots = projects.reduce((a, p) => a + (p.shots?.length || 0), 0);
    const raw = localStorage.getItem('superpipe_v1') || '';
    const kb = Math.round(raw.length / 1024);
    const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

    document.getElementById('stat-projects').textContent = projects.length;
    document.getElementById('stat-shots').textContent = shots;
    document.getElementById('stat-size').textContent = size;
  },

  exportData() {
    const data = JSON.stringify(State.raw(), null, 2);
    Downloader.download(
      'data:application/json;charset=utf-8,' + encodeURIComponent(data),
      `superpipe_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
  },

  importData() {
    document.getElementById('import-file').click();
  },

  doImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        localStorage.setItem('superpipe_v1', JSON.stringify(data));
        State.load();
        Toast.success('Données importées — rechargement...');
        setTimeout(() => location.reload(), 1500);
      } catch {
        Toast.error('Fichier invalide');
      }
    };
    reader.readAsText(file);
  },

  clearAll() {
    if (!confirm('Effacer TOUS les projets et configurations ? Cette action est irréversible.')) return;
    localStorage.removeItem('superpipe_v1');
    location.reload();
  },
};
