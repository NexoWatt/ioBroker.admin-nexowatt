'use strict';
const fs = require('fs');
const path = require('path');
const utils = require('@iobroker/adapter-core');

class AdminNexowatt extends utils.Adapter {
  constructor(options) {
    super({ ...options, name: 'admin-nexowatt' });
  }

  async onReady() {
    try {
      this.log.info('Deploying NexoWatt theme to Admin...');

      const files = [
        { src: path.join(__dirname, 'admin', 'nexowatt.css'), rel: 'nexowatt/nexowatt.css' },
        { src: path.join(__dirname, 'admin', 'nexowatt.js'),  rel: 'nexowatt/nexowatt.js'  },
        { src: path.join(__dirname, 'admin', 'index_m.html'), rel: 'nexowatt/index_m.html' },
        { src: path.join(__dirname, 'admin', 'img', 'logo.png'), rel: 'nexowatt/img/logo.png' },
      ];

      // Admin 7+ preferred location
      await this.mkdirAsync('admin.themes', 'nexowatt');
      await this.mkdirAsync('admin.themes', 'nexowatt/img');
      for (const f of files) {
        const buf = fs.readFileSync(f.src);
        await this.writeFileAsync('admin.themes', f.rel, buf);
        this.log.info(`Wrote admin.themes/${f.rel}`);
      }

      // Legacy fallback for older Admin
      try {
        await this.mkdirAsync('admin', 'themes/nexowatt');
        await this.mkdirAsync('admin', 'themes/nexowatt/img');
        for (const f of files) {
          const buf = fs.readFileSync(f.src);
          await this.writeFileAsync('admin', `themes/${f.rel}`, buf);
          this.log.info(`Wrote admin/themes/${f.rel}`);
        }
      } catch (e) {
        this.log.debug(`Legacy write skipped: ${e.message}`);
      }

      if (this.config.autoApplyTheme) {
        const adminId = 'system.adapter.admin.0';
        try {
          const obj = await this.getForeignObjectAsync(adminId);
          if (obj && obj.native) {
            let changed = false;
            if (obj.native.theme !== this.config.themeName) {
              obj.native.theme = this.config.themeName; changed = true;
            }
            if (obj.native.themeName !== this.config.themeName) {
              obj.native.themeName = this.config.themeName; changed = true;
            }
            if (changed) {
              await this.setForeignObjectAsync(adminId, obj);
              this.log.info(`Set Admin theme to "${this.config.themeName}". Please restart admin if not applied.`);
            } else {
              this.log.info(`Admin theme already set to "${this.config.themeName}".`);
            }
          } else {
            this.log.warn('Could not load admin.0 object to set theme automatically.');
          }
        } catch (e) {
          this.log.warn(`Failed to set Admin theme automatically: ${e.message}`);
        }
      } else {
        this.log.info('Auto-apply disabled. Select theme in Admin settings → Theme.');
      }

      this.log.info('NexoWatt theme deployment finished.');
    } catch (e) {
      this.log.error(`Deployment error: ${e.message}`);
    }
  }
}

if (module.parent) {
  module.exports = (options) => new AdminNexowatt(options);
} else {
  new AdminNexowatt();
}
