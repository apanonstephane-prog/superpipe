/**
 * SUPER PIPE — Téléchargement automatique
 * Télécharge images et vidéos en local dès validation.
 */

const Downloader = {
  /**
   * Télécharge un fichier depuis une URL ou base64.
   * @param {string} src — URL ou data:... base64
   * @param {string} filename
   */
  async download(src, filename) {
    try {
      let blob;
      if (src.startsWith('data:')) {
        // base64 → blob
        const [header, data] = src.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const bytes = atob(data);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        blob = new Blob([arr], { type: mime });
      } else {
        // URL distante
        const resp = await fetch(src);
        blob = await resp.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      Toast.success(`📥 ${filename} téléchargé`);
    } catch (e) {
      Toast.error(`Erreur téléchargement : ${filename}`);
      console.error(e);
    }
  },

  /**
   * Convertit un File en base64 string.
   */
  fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },

  /**
   * Télécharge tous les shots validés en un zip si possible, sinon un par un.
   */
  async downloadAllShots(shots) {
    const validated = shots.filter(s => s.validated && (s.videoBase64 || s.videoUrl));
    if (validated.length === 0) { Toast.info('Aucun shot validé à télécharger'); return; }

    for (let i = 0; i < validated.length; i++) {
      const s = validated[i];
      const src = s.videoBase64 || s.videoUrl;
      await this.download(src, `shot_${String(i + 1).padStart(3, '0')}_${s.section || 'clip'}.mp4`);
      await new Promise(r => setTimeout(r, 400)); // délai entre téléchargements
    }
    Toast.success(`${validated.length} shots téléchargés`);
  },

  /**
   * Télécharge le montage final.
   */
  async downloadMontage(project) {
    const src = project.montageBase64 || project.montageUrl;
    if (!src) { Toast.error('Aucun montage disponible'); return; }
    const name = `${project.name.replace(/[^a-z0-9]/gi, '_')}_final.mp4`;
    await this.download(src, name);
  },

  /**
   * Auto-téléchargement déclenché à la validation d'un shot.
   */
  async autoDownloadShot(shot, index) {
    const src = shot.videoBase64 || shot.videoUrl;
    if (!src) return;
    await this.download(src, `shot_${String(index + 1).padStart(3, '0')}_${shot.section || 'clip'}.mp4`);
  },

  /**
   * Auto-téléchargement d'une image (CRef / LRef).
   */
  async autoDownloadImage(base64, name) {
    await this.download(base64, name);
  },
};
