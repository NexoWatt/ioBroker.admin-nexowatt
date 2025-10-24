'use strict';

const utils = require('@iobroker/adapter-core');

class AdminNexowatt extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'admin-nexowatt',
    });
  }

  onReady() {
    this.log.info('NexoWatt EMS theme loaded and activated.');
  }
}

if (module.parent) {
  module.exports = (options) => new AdminNexowatt(options);
} else {
  new AdminNexowatt();
}
