/**
 * SUPER PIPE — App Controller
 */

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── ApiBar — champs Claude + Replicate + Shotstack dans le topbar ──
const ApiBar = {
  init() {
    const cfg = State.getConfig();
    const cEl = document.getElementById('hdr-claude-key');
    const rEl = document.getElementById('hdr-replicate-key');
    const sEl = document.getElementById('hdr-shotstack-key');
    if (cEl && cfg.openrouterApiKey)  cEl.value = cfg.openrouterApiKey;
    const mEl = document.getElementById('hdr-or-model');
    if (mEl && cfg.openrouterModel)   mEl.value = cfg.openrouterModel;
    if (rEl && cfg.replicateApiKey) rEl.value = cfg.replicateApiKey;
    if (sEl && cfg.shotstackApiKey) sEl.value = cfg.shotstackApiKey;
    this.updateDots();
  },

  save() {
    const cVal = document.getElementById('hdr-claude-key')?.value.trim()    || '';
    const rVal = document.getElementById('hdr-replicate-key')?.value.trim() || '';
    const sVal = document.getElementById('hdr-shotstack-key')?.value.trim() || '';
    const mVal = document.getElementById('hdr-or-model')?.value             || 'anthropic/claude-sonnet-4-6';
    State.updateConfig({ openrouterApiKey: cVal, replicateApiKey: rVal, shotstackApiKey: sVal, openrouterModel: mVal });
    this.updateDots();
  },

  connect() {
    this.save();
    const cfg = State.getConfig();
    const anyOk = cfg.openrouterApiKey || cfg.replicateApiKey || cfg.shotstackApiKey;
    if (anyOk) {
      Toast.success('APIs sauvegardées ✓');
    } else {
      Toast.error('Entrez au moins une clé API');
    }
    this.updateDots();
  },

  updateDots() {
    const cfg  = State.getConfig();
    const cDot = document.getElementById('dot-claude');
    const rDot = document.getElementById('dot-replicate');
    const sDot = document.getElementById('dot-shotstack');
    if (cDot) cDot.className = 'api-block-dot' + (cfg.openrouterApiKey ? ' ok' : '');
    if (rDot) rDot.className = 'api-block-dot' + (cfg.replicateApiKey ? ' ok' : '');
    if (sDot) sDot.className = 'api-block-dot' + (cfg.shotstackApiKey ? ' ok' : '');

    const btn = document.getElementById('topbar-connect-btn');
    if (!btn) return;
    const allOk     = cfg.openrouterApiKey && cfg.replicateApiKey && cfg.shotstackApiKey;
    const someOk    = cfg.openrouterApiKey || cfg.replicateApiKey || cfg.shotstackApiKey;
    if (allOk) {
      btn.textContent = '● CONNECTÉ';
      btn.classList.add('connected');
    } else if (someOk) {
      btn.textContent = '◑ PARTIEL';
      btn.classList.remove('connected');
    } else {
      btn.textContent = 'CONNECTER';
      btn.classList.remove('connected');
    }
  },
};

// ── App principal ──
const App = {
  currentModule: 'project',

  modules: {
    project:  ModuleProject,
    cref:     ModuleCRef,
    lref:     ModuleLRef,
    script:   ModuleScript,
    objects:  ModuleObjects,
    shots:    ModuleShots,
    titrage:  ModuleTitrage,
    montage:  ModuleMontage,
  },

  init() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.goTo(btn.dataset.module));
    });

    // Accent color picker
    document.querySelectorAll('.swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        State.updateConfig({ accent: color });
        this.applyAccent(color);
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    // Fermer modal au clic overlay
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

    // Nouveau projet
    document.getElementById('btn-new-project').addEventListener('click', () => {
      const name = prompt('Nom du nouveau projet :');
      if (!name?.trim()) return;
      State.createProject(name.trim());
      this.refreshProjectList();
      this.goTo('project');
      Toast.success(`Projet "${name}" créé`);
    });

    // Charger accent sauvegardé
    const cfg = State.getConfig();
    const accent = cfg.accent || '#C9A84C';
    this.applyAccent(accent);
    document.querySelectorAll('.swatch').forEach(s => {
      if (s.dataset.color === accent) s.classList.add('active');
    });

    // Initialiser ApiBar
    ApiBar.init();

    // Init
    this.refreshProjectList();
    this.updateBadges();
    this.updateSidebarStats();
    this.goTo('project');
  },

  goTo(module) {
    if (!this.modules[module]) return;
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const moduleEl = document.getElementById(`module-${module}`);
    if (moduleEl) moduleEl.classList.add('active');
    const navBtn = document.querySelector(`.nav-item[data-module="${module}"]`);
    if (navBtn) navBtn.classList.add('active');

    this.currentModule = module;

    // Mettre à jour le titre topbar
    const titles = {
      project: 'SUPER PIPE — Projet',
      cref:    'SUPER PIPE — Personnages CRef',
      lref:    'SUPER PIPE — Lieux LRef',
      script:  'SUPER PIPE — Script',
      objects: 'SUPER PIPE — Objets & Props',
      shots:   'SUPER PIPE — Shots Kling 3',
      montage: 'SUPER PIPE — Montage Shotstack',
    };
    const titleEl = document.getElementById('topbar-module-name');
    if (titleEl) titleEl.textContent = titles[module] || 'SUPER PIPE';

    this.modules[module]?.render();
  },

  refreshProjectList() {
    const projects = State.allProjects();
    const current = State.currentProject();
    const el = document.getElementById('project-list');
    if (!el) return;

    if (projects.length === 0) {
      el.innerHTML = '<div class="text-muted text-small" style="padding:8px 16px">Aucun projet</div>';
      return;
    }

    el.innerHTML = projects.map(p => `
      <div class="project-item ${current?.id === p.id ? 'current' : ''}" onclick="App.selectProject('${p.id}')">
        <span class="project-item-name">${escHtml(p.name)}</span>
        <button class="project-item-del" onclick="event.stopPropagation();App.deleteProject('${p.id}')" title="Supprimer">✕</button>
      </div>
    `).join('');
  },

  selectProject(id) {
    State.setCurrentProject(id);
    this.refreshProjectList();
    this.updateBadges();
    this.updateSidebarStats();
    this.goTo(this.currentModule);
    Toast.info(`Projet : ${State.currentProject()?.name}`);
  },

  deleteProject(id) {
    const p = State.raw().projects[id];
    if (!confirm(`Supprimer "${p?.name}" ? Irréversible.`)) return;
    State.deleteProject(id);
    this.refreshProjectList();
    this.updateBadges();
    this.updateSidebarStats();
    this.goTo('project');
  },

  updateBadges() {
    const p = State.currentProject();
    if (!p) return;

    const setBadge = (id, count, locked = false) => {
      const el = document.getElementById(`badge-${id}`);
      if (!el) return;
      if (count > 0) {
        el.textContent = count;
        el.classList.add('show');
        locked ? el.classList.add('locked') : el.classList.remove('locked');
      } else {
        el.classList.remove('show', 'locked');
      }
    };

    setBadge('project', p.genre ? 1 : 0, !!p.genre);
    setBadge('cref',    p.characters?.length   || 0, (p.characters || []).some(c => c.locked));
    setBadge('lref',    p.locations?.length    || 0, (p.locations  || []).some(l => l.locked));
    setBadge('script',  p.scriptSections?.length || 0, (p.scriptSections?.length || 0) > 0);
    setBadge('objects', p.objects?.length      || 0, (p.objects    || []).some(o => o.locked));
    const validatedRushes = (p.rushes || []).filter(r => r.validated).length;
    setBadge('shots',   p.rushes?.length        || 0, validatedRushes > 0);
    setBadge('titrage', p.titrages?.length      || 0, (p.titrages || []).some(t => t.locked));
    setBadge('montage', p.montageStatus === 'done' ? 1 : 0, p.montageStatus === 'done');
  },

  updateSidebarStats() {
    const p = State.currentProject();
    if (!p) return;
    const rushes    = p.rushes || [];
    const validated = rushes.filter(r => r.validated).length;
    const generated = rushes.filter(r => r.status === 'done' || r.videoUrl).length;
    const pending   = rushes.filter(r => r.status === 'pending' || r.status === 'generating').length;

    // Coût : 10s × $0.15/s = $1.50 par rush généré
    const COST_PER_RUSH = 1.50;
    const spent    = generated * COST_PER_RUSH;
    const estimate = pending   * COST_PER_RUSH;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('sb-progression', `${validated} / ${rushes.length}`);
    set('sb-validated',   validated);
    set('sb-chars',       p.characters?.length || 0);
    set('sb-locs',        p.locations?.length  || 0);
    set('sb-cost-spent',  `$${spent.toFixed(2)}`);
    set('sb-cost-est',    pending > 0 ? `+$${estimate.toFixed(2)} en attente` : '');
  },

  applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-dim',    `rgba(${r},${g},${b},0.10)`);
    document.documentElement.style.setProperty('--accent-border', `rgba(${r},${g},${b},0.30)`);
    document.documentElement.style.setProperty('--accent-glow',   `rgba(${r},${g},${b},0.05)`);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
