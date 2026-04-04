/**
 * MODULE SCRIPT — Écriture et structuration du script
 */

const ModuleScript = {

  // Détermine la catégorie du genre courant
  _getGenreCat(genre) {
    if (genre === 'pub')   return 'pub';
    if (['court','moyen','long'].includes(genre)) return 'film';
    return 'clip';
  },

  render() {
    const p = State.currentProject();
    if (!p) return;
    const el       = document.getElementById('module-script');
    const sections = p.scriptSections || [];
    const playbook = PromptEngine.getPlaybook(p.genre);
    const cat      = this._getGenreCat(p.genre);

    // Placeholder et titre adaptés au genre
    const placeholders = {
      clip: '[Intro]\nDescription de la scène d\'intro...\n\n[Couplet 1]\nParoles ou description visuelle...\n\n[Refrain]\nDescription du refrain...',
      pub:  '[Hook]\nImage choc d\'ouverture, 3 premières secondes...\n\n[Démonstration]\nProduit en action, bénéfice clair...\n\n[CTA / Signature]\nNom du produit, tagline, call to action...',
      film: '[Exposition]\nMonde, personnage, enjeu initial...\n\n[Élément déclencheur]\nL\'événement qui brise l\'équilibre...\n\n[Développement]\nObstacles, révélations, tension montante...\n\n[Climax]\nMoment de vérité décisif...\n\n[Dénouement]\nConséquences, transformation du personnage...',
    };

    const descTexts = {
      clip: `Structurez votre clip en sections. Claude génère les prompts Kling selon les règles du playbook <strong style="color:var(--accent)">${playbook?.label || p.genre || ''}</strong>.`,
      pub:  `Structurez votre publicité en phases. Format : <strong style="color:var(--accent)">${playbook?.formats?.join(' · ') || '15s / 30s / 60s'}</strong>. Structure cible : <em>${playbook?.structure3 || ''}</em>`,
      film: `Structurez votre film en séquences dramatiques selon les règles du <strong style="color:var(--accent)">${playbook?.label || ''}</strong>. Structure recommandée : <em>${playbook?.structure3 || ''}</em>`,
    };

    el.innerHTML = `
      <div class="module-header">
        <div class="module-title">Script <span>&</span> Structure</div>
        <div class="module-desc">${descTexts[cat] || ''}</div>
      </div>

      ${playbook?.pillarsPub || playbook?.pillarsFilm ? `
        <div class="card" style="margin-bottom:14px;padding:10px 16px">
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);letter-spacing:1px">PILIERS</div>
            ${(playbook.pillarsPub || playbook.pillarsFilm || '').split(' · ').map(p => `
              <div style="font-size:11px;color:var(--accent);font-weight:600">${escHtml(p)}</div>
            `).join('<span style="color:var(--border)">·</span>')}
            ${playbook.danger ? `
              <div style="margin-left:auto;font-size:10px;color:var(--warning);font-family:var(--font-mono)">
                ⚠ ${escHtml(playbook.danger.substring(0, 80))}${playbook.danger.length > 80 ? '…' : ''}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-title">Script libre</div>
        <p class="text-muted text-small" style="margin-bottom:12px">
          ${cat === 'clip' ? 'Collez vos paroles ou description visuelle. L\'auto-détection reconnaît les marqueurs <code>[Intro]</code>, <code>[Refrain]</code>, etc.' : ''}
          ${cat === 'pub'  ? 'Décrivez chaque phase de votre spot. L\'auto-détection reconnaît <code>[Hook]</code>, <code>[Démonstration]</code>, <code>[CTA]</code>, etc.' : ''}
          ${cat === 'film' ? 'Écrivez votre synopsis ou découpage séquencier. L\'auto-détection reconnaît <code>[Exposition]</code>, <code>[Climax]</code>, etc.' : ''}
        </p>
        <textarea class="script-area" id="script-raw" rows="9" placeholder="${placeholders[cat] || ''}">${escHtml(p.scriptText || '')}</textarea>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="ModuleScript.saveRaw()">💾 Sauvegarder</button>
          <button class="btn btn-primary btn-sm" onclick="ModuleScript.parseScript()">⚡ Parser en sections</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          ${cat === 'clip' ? 'Sections du clip' : cat === 'pub' ? 'Phases du spot' : 'Séquences du film'}
          <span class="text-muted" style="font-size:10px;font-weight:400;margin-left:8px">${sections.length} ${sections.length > 1 ? 'sections' : 'section'}</span>
        </div>
        ${sections.length === 0 ? `
          <div class="empty-state" style="padding:24px">
            <div class="empty-state-icon" style="font-size:28px">◳</div>
            <div class="empty-state-text">Parsez le script ou ajoutez des sections manuellement</div>
          </div>
        ` : `
          <div id="sections-list">
            ${sections.map((s, i) => this.renderSection(s, i, cat)).join('')}
          </div>
        `}
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="ModuleScript.addSection()">+ Ajouter section</button>
          ${sections.length > 0 ? `<button class="btn btn-primary btn-sm" onclick="App.goTo('shots')">→ Générer les shots</button>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">SOP Pipeline — Document Fondation §5</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
          ${PromptEngine.SOP_PASSES.map(pass => `
            <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center">
              <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--accent)">${pass.id}</div>
              <div style="font-size:10px;font-weight:700;color:var(--text-1);margin:4px 0">${pass.label}</div>
              <div style="font-size:9px;color:var(--text-3)">${pass.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderSection(s, index, cat) {
    const p          = State.currentProject();
    const sectionDef = PromptEngine.SECTION_TYPES[s.type];
    // Afficher seulement les types adaptés au genre courant
    const relevantTypes = PromptEngine.getSectionTypesForGenre(p.genre);

    return `
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-3)">
          <select style="background:var(--bg-2);border:1px solid var(--border);color:var(--text-1);padding:4px 8px;border-radius:4px;font-size:11px;font-family:var(--font-mono)" onchange="ModuleScript.updateSectionType(${index}, this.value)">
            ${relevantTypes.map(v => `
              <option value="${v.key}" ${s.type === v.key ? 'selected' : ''}>${v.label}</option>
            `).join('')}
          </select>
          <input type="text" value="${escHtml(s.label || '')}" placeholder="Label..." style="flex:1;background:transparent;border:none;color:var(--text-0);font-family:var(--font-display);font-size:13px;font-weight:600;outline:none" onchange="ModuleScript.updateSectionLabel(${index}, this.value)" />
          <button style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:16px" onclick="ModuleScript.removeSection(${index})">✕</button>
        </div>
        <div style="padding:10px 14px">
          <div class="section-divider">
            <div class="section-divider-line"></div>
            <div class="section-divider-label">${escHtml(sectionDef?.cut || '')}</div>
            <div class="section-divider-line"></div>
          </div>
          <textarea rows="4" style="width:100%;background:transparent;border:none;color:var(--text-1);font-family:var(--font-mono);font-size:11px;line-height:1.7;outline:none;resize:vertical"
            placeholder="${escHtml(sectionDef?.klingHint || 'Description visuelle…')}"
            oninput="ModuleScript.updateSectionContent(${index}, this.value)">${escHtml(s.content || '')}</textarea>
        </div>
      </div>
    `;
  },

  saveRaw() {
    const text = document.getElementById('script-raw').value;
    State.updateProject({ scriptText: text });
    Toast.success('Script sauvegardé');
  },

  parseScript() {
    const text = document.getElementById('script-raw').value;
    if (!text.trim()) { Toast.error('Script vide'); return; }
    State.updateProject({ scriptText: text });

    // Parser les sections marquées par [Label]
    const lines = text.split('\n');
    const sections = [];
    let current = null;

    lines.forEach(line => {
      const match = line.match(/^\[(.+)\]/);
      if (match) {
        if (current) sections.push(current);
        const rawLabel = match[1].trim();
        const typeKey = this.guessType(rawLabel);
        current = { id: 'sec_' + Date.now() + Math.random(), label: rawLabel, type: typeKey, content: '' };
      } else if (current) {
        current.content += (current.content ? '\n' : '') + line;
      }
    });
    if (current) sections.push(current);

    if (sections.length === 0) {
      // Pas de marqueurs → créer une seule section
      sections.push({ id: 'sec_' + Date.now(), label: 'Clip complet', type: 'verse', content: text });
    }

    State.updateProject({ scriptSections: sections });
    Toast.success(`${sections.length} section${sections.length > 1 ? 's' : ''} détectée${sections.length > 1 ? 's' : ''}`);
    this.render();
    App.updateBadges();
  },

  guessType(label) {
    const l = label.toLowerCase();

    // ── CLIP ──
    if (l.includes('intro'))                              return 'intro';
    if (l.includes('outro') || l.includes('fin') || l.includes('end')) return 'outro';
    if (l.includes('refrain') || l.includes('chorus'))   return 'chorus';
    if (l.includes('pont') || l.includes('bridge'))      return 'bridge';
    if (l.includes('break') || l.includes('drop') || l.includes('instru')) return 'breakdown';
    if (l.includes('pré') || l.includes('pre'))          return 'prechorus';

    // ── PUB ──
    if (l.includes('hook'))                              return 'pub_hook';
    if (l.includes('problème') || l.includes('problem')) return 'pub_problem';
    if (l.includes('démo') || l.includes('demo') || l.includes('démonstration')) return 'pub_demo';
    if (l.includes('bénéfice') || l.includes('benefit') || l.includes('avantage')) return 'pub_benefit';
    if (l.includes('cta') || l.includes('signature') || l.includes('call'))  return 'pub_cta';

    // ── FILM ──
    if (l.includes('exposition') || l.includes('ouverture')) return 'exposition';
    if (l.includes('déclencheur') || l.includes('inciting')) return 'inciting';
    if (l.includes('plot') || l.includes('point'))          return 'plot1';
    if (l.includes('développement') || l.includes('development')) return 'developt';
    if (l.includes('midpoint') || l.includes('mi-parcours')) return 'midpoint';
    if (l.includes('crise') || l.includes('crisis'))        return 'crisis';
    if (l.includes('climax'))                               return 'climax';
    if (l.includes('dénouement') || l.includes('resolution')) return 'denouement';
    if (l.includes('épilogue') || l.includes('epilogue'))   return 'epilogue';
    if (l.includes('action'))                               return 'scene_action';
    if (l.includes('dialogue'))                             return 'scene_dialogue';
    if (l.includes('silence') || l.includes('contempl'))   return 'scene_silent';
    if (l.includes('scène') || l.includes('scene'))         return 'scene';

    // Par défaut selon le genre
    const p   = State.currentProject();
    const cat = this._getGenreCat(p?.genre);
    if (cat === 'pub')  return 'pub_benefit';
    if (cat === 'film') return 'developt';
    return 'verse';
  },

  addSection() {
    const p   = State.currentProject();
    const cat = this._getGenreCat(p.genre);
    const defaultTypes = { clip: 'verse', pub: 'pub_benefit', film: 'developt' };
    const sections = [...(p.scriptSections || [])];
    sections.push({ id: 'sec_' + Date.now(), label: 'Nouvelle section', type: defaultTypes[cat] || 'verse', content: '' });
    State.updateProject({ scriptSections: sections });
    this.render();
  },

  removeSection(index) {
    const p = State.currentProject();
    const sections = [...(p.scriptSections || [])];
    sections.splice(index, 1);
    State.updateProject({ scriptSections: sections });
    this.render();
    App.updateBadges();
  },

  updateSectionType(index, type) {
    const p = State.currentProject();
    const sections = [...(p.scriptSections || [])];
    sections[index].type = type;
    State.updateProject({ scriptSections: sections });
  },

  updateSectionLabel(index, label) {
    const p = State.currentProject();
    const sections = [...(p.scriptSections || [])];
    sections[index].label = label;
    State.updateProject({ scriptSections: sections });
  },

  updateSectionContent(index, content) {
    const p = State.currentProject();
    const sections = [...(p.scriptSections || [])];
    sections[index].content = content;
    State.updateProject({ scriptSections: sections });
  },
};
