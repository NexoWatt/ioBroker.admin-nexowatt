'use strict';

const utils = require('@iobroker/adapter-core');

let http, createProxyServer, fs, path, net;

class AdminNexowatt extends utils.Adapter {
  constructor(options) {
    super({ ...options, name: 'admin-nexowatt' });
    this.server = null;
    this.proxy = null;
    this.keepAliveTimer = null;
  }

  async onReady() {
    this.log.info('NexoWatt EMS: starting proxy initialization...');

    // Keep the event loop busy so Node 22+ doesn't exit immediately
    this.keepAliveTimer = this.setInterval(() => {}, 10000);

    try {
      http = require('http');
      ({ createProxyServer } = require('http-proxy'));
      fs = require('fs');
      path = require('path');
      net = require('net');
    } catch (e) {
      this.log.error('Required module missing: ' + e.message);
      this.log.error('Please run: iobroker rebuild admin-nexowatt');
      return;
    }

    process.on('unhandledRejection', (reason) => {
      this.log.error('Unhandled Rejection: ' + (reason && reason.stack || reason));
    });
    process.on('uncaughtException', (err) => {
      this.log.error('Uncaught Exception: ' + err.stack);
    });

    const testPort = (host, port, timeout = 1500) => new Promise((resolve) => {
      const sock = new (require('net').Socket)();
      const end = () => { try { sock.destroy(); } catch(e) {} resolve(false); };
      sock.setTimeout(timeout);
      sock.once('error', end);
      sock.once('timeout', end);
      sock.connect(port, host, () => { sock.end(); resolve(true); });
    });

    try {
      let adminHost = this.config.adminHost || '127.0.0.1';
      const adminPort = this.config.adminPort || 8081;
      const port = this.config.port || 8181;

      this.log.info(`NexoWatt EMS: preparing proxy on :${port} -> Admin at ${adminHost}:${adminPort}`);

      // Fallback to host IP if 127.0.0.1 fails
      const okLocal = await testPort(adminHost, adminPort, 1200);
      if (!okLocal && this.common && this.common.host) {
        try {
          const hostObjId = 'system.host.' + this.common.host;
          const hostObj = await this.getForeignObjectAsync(hostObjId);
          const ip = hostObj && hostObj.common && Array.isArray(hostObj.common.address) ? hostObj.common.address[0] : null;
          if (ip) {
            const okIp = await testPort(ip, adminPort, 1200);
            if (okIp) {
              this.log.warn(`Admin not reachable at ${adminHost}:${adminPort}; switching to ${ip}:${adminPort}`);
              adminHost = ip;
            } else {
              this.log.warn(`Admin also not reachable at ${ip}:${adminPort}. Check Admin port and host.`);
            }
          }
        } catch (e) {
          this.log.warn('Could not read system.host.* to determine IP: ' + e.message);
        }
      }

      const css = '/* injected by NexoWatt EMS */';
      const js  = "console.log('NexoWatt EMS overlay active');";

      this.proxy = require('http-proxy').createProxyServer({
        target: { host: adminHost, port: adminPort },
        selfHandleResponse: true,
        changeOrigin: true,
      });

      this.proxy.on('error', (err, req, res) => {
        this.log.error(`Proxy error: ${err.message}`);
        if (res && !res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
        if (res) res.end('NexoWatt proxy could not reach ioBroker Admin.');
      });

      this.proxy.on('proxyRes', (proxyRes, req, res) => {
        const contentType = (proxyRes.headers['content-type'] || '').toString();
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (contentType.includes('text/html')) {
            let html = buffer.toString('utf8');
            const injectTag = `\n<link rel="stylesheet" href="/__nexowatt__/nexowatt.css" />\n<script src="/__nexowatt__/nexowatt.js"></script>\n`;
            html = html.includes('</head>') ? html.replace('</head>', `${injectTag}</head>`) : (injectTag + html);
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            res.end(html);
          } else {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            res.end(buffer);
          }
        });
      });

      this.server = require('http').createServer((req, res) => {
        if (req.url.startsWith('/__nexowatt__/')) {
          if (req.url.endsWith('nexowatt.css')) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            return res.end(css);
          }
          if (req.url.endsWith('nexowatt.js')) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            return res.end(js);
          }
          res.writeHead(404); return res.end('not found');
        }
        this.proxy.web(req, res);
      });

      this.server.on('error', (e) => {
        this.log.error(`HTTP server error on port ${port}: ${e.message}`);
      });

      this.server.listen(port, '0.0.0.0', () => {
        this.log.info(`NexoWatt EMS proxy listening on 0.0.0.0:${port} → Admin ${adminHost}:${adminPort}`);
      });

    } catch (e) {
      this.log.error(`onReady top-level error: ${e.stack || e.message}`);
    }
  }

  onUnload(callback) {
    try {
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      if (this.server) {
        this.server.close(() => this.log.info('NexoWatt proxy stopped.'));
      }
      if (this.proxy) this.proxy.close();
      callback();
    } catch (e) {
      callback();
    }
  }
}

if (module.parent) {
  module.exports = (options) => new AdminNexowatt(options);
} else {
  new AdminNexowatt();
}
