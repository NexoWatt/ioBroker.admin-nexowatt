'use strict';

const fs = require('fs');
const path = require('path');
const utils = require('@iobroker/adapter-core');

class AdminNexowatt extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'admin-nexowatt',
    });
  }

  async onReady() {
    try {
      const filesToCopy = [
        { src: path.join(__dirname, 'admin', 'nexowatt.css'), rel: 'nexowatt/nexowatt.css' },
        { src: path.join(__dirname, 'admin', 'nexowatt.js'),  rel: 'nexowatt/nexowatt.js'  },
        { src: path.join(__dirname, 'admin', 'index_m.html'), rel: 'nexowatt/index_m.html' },
        { src: path.join(__dirname, 'admin', 'img', 'logo.png'), rel: 'nexowatt/img/logo.png' },
      ];

      // 1) Preferred (Admin >=7): write into "admin.themes" filespace
      try {
        await this.mkdirAsync('admin.themes', 'nexowatt');
        await this.mkdirAsync('admin.themes', 'nexowatt/img');
        for (const f of filesToCopy) {
          const buf = fs.readFileSync(f.src);
          await this.writeFileAsync('admin.themes', f.rel, buf);
          this.log.info(`Deployed to admin.themes: ${f.rel}`);
        }
      } catch (e) {
        this.log.warn(`admin.themes not available or write failed: ${e.message}`);
      }

      // 2) Legacy fallback (Admin <=6): write into "admin" filespace under themes/
      try {
        await this.mkdirAsync('admin', 'themes/nexowatt');
        await this.mkdirAsync('admin', 'themes/nexowatt/img');
        for (const f of filesToCopy) {
          const buf = fs.readFileSync(f.src);
          await this.writeFileAsync('admin', `themes/${f.rel}`, buf);
          this.log.info(`Deployed to admin (legacy): themes/${f.rel}`);
        }
      } catch (e) {
        this.log.warn(`Legacy admin themes write failed: ${e.message}`);
      }

      // Try to set theme in admin config for both potential keys
      const adminInstanceId = 'system.adapter.admin.0';
      try {
        const obj = await this.getForeignObjectAsync(adminInstanceId);
        if (obj && obj.native) {
          let changed = false;
          if (obj.native.theme !== 'nexowatt') {
            obj.native.theme = 'nexowatt';
            changed = true;
          }
          if (obj.native.themeName !== 'nexowatt') {
            obj.native.themeName = 'nexowatt';
            changed = true;
          }
          if (changed) {
            await this.setForeignObjectAsync(adminInstanceId, obj);
            this.log.info('Configured Admin to use theme "nexowatt". A restart of admin may be required.');
          } else {
            this.log.info('Admin already configured to theme "nexowatt".');
          }
        } else {
          this.log.warn('Could not read admin.0 object to set theme automatically.');
        }
      } catch (e) {
        this.log.warn(`Failed to set Admin theme automatically: ${e.message}`);
      }

      this.log.info('NexoWatt EMS theme deployment finished.');
    } catch (e) {
      this.log.error(`Unexpected error: ${e.message}`);
    }
  }
}

if (module.parent) {
  module.exports = (options) => new AdminNexowatt(options);
} else {
  new AdminNexowatt();
}
