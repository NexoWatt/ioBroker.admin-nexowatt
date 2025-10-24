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
      const themeBase = 'themes/nexowatt';
      const filesToCopy = [
        { src: path.join(__dirname, 'admin', 'nexowatt.css'), dst: `${themeBase}/nexowatt.css` },
        { src: path.join(__dirname, 'admin', 'nexowatt.js'),  dst: `${themeBase}/nexowatt.js`  },
        { src: path.join(__dirname, 'admin', 'index_m.html'), dst: `${themeBase}/index_m.html` },
        { src: path.join(__dirname, 'admin', 'img', 'logo.png'), dst: `${themeBase}/img/logo.png` },
      ];

      await this.mkdirAsync('admin', themeBase);
      await this.mkdirAsync('admin', `${themeBase}/img`);

      for (const f of filesToCopy) {
        const buf = fs.readFileSync(f.src);
        await this.writeFileAsync('admin', f.dst, buf);
        this.log.info(`Deployed ${f.dst} to admin files.`);
      }

      const adminInstance = `system.adapter.admin.0`;
      const obj = await this.getForeignObjectAsync(adminInstance);
      if (obj && obj.native) {
        if (obj.native.theme !== 'nexowatt') {
          obj.native.theme = 'nexowatt';
          await this.setForeignObjectAsync(adminInstance, obj);
          this.log.info('Set Admin theme to "nexowatt" (restart admin if not applied).');
        }
      } else {
        this.log.warn('Could not find admin.0 to set theme automatically. Select it in Admin settings -> Theme.');
      }

      this.log.info('NexoWatt EMS theme deployed successfully.');
    } catch (e) {
      this.log.error(`Failed to deploy theme: ${e.message}`);
    }
  }
}

if (module.parent) {
  module.exports = (options) => new AdminNexowatt(options);
} else {
  new AdminNexowatt();
}
