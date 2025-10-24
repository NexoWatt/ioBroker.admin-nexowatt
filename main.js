'use strict';

const utils = require('@iobroker/adapter-core');
const http = require('http');
const { createProxyServer } = require('http-proxy');
const { readFileSync, existsSync } = require('fs');
const path = require('path');

class AdminNexowatt extends utils.Adapter {
  constructor(options) {
    super({ ...options, name: 'admin-nexowatt' });
    this.server = null;
    this.proxy = null;
  }

  async onReady() {
    try {
      const adminHost = this.config.adminHost || '127.0.0.1';
      const adminPort = this.config.adminPort || 8081;
      const port = this.config.port || 8181;

      // Simple assets handler
      const assets = {
        css: readFileSync(path.join(__dirname, 'admin', 'nexowatt.css')),
        js: readFileSync(path.join(__dirname, 'admin', 'nexowatt.js')),
        logo: existsSync(path.join(__dirname, 'admin', 'img', 'logo.png'))
          ? readFileSync(path.join(__dirname, 'admin', 'img', 'logo.png'))
          : null,
      };

      this.proxy = createProxyServer({
        target: { host: adminHost, port: adminPort },
        selfHandleResponse: true,
        changeOrigin: true,
      });

      this.proxy.on('error', (err, req, res) => {
        this.log.error(`Proxy error: ${err.message}`);
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('NexoWatt proxy could not reach ioBroker Admin.');
      });

      // Intercept responses to inject CSS/JS into main HTML document(s)
      this.proxy.on('proxyRes', (proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (contentType.includes('text/html')) {
            let html = buffer.toString('utf8');
            // Inject our overlay assets before closing </head>
            const injectTag = `\n<link rel="stylesheet" href="/__nexowatt__/nexowatt.css" />\n<script src="/__nexowatt__/nexowatt.js"></script>\n`;
            html = html.replace('</head>', `${injectTag}</head>`);
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            res.end(html);
          } else {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            res.end(buffer);
          }
        });
      });

      this.server = http.createServer((req, res) => {
        // Serve overlay assets under a dedicated path
        if (req.url.startsWith('/__nexowatt__/')) {
          if (req.url.endsWith('nexowatt.css')) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            return res.end(assets.css);
          }
          if (req.url.endsWith('nexowatt.js')) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            return res.end(assets.js);
          }
          if (req.url.includes('/img/logo.png') && assets.logo) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            return res.end(assets.logo);
          }
          res.writeHead(404); return res.end('not found');
        }
        // Otherwise proxy to Admin
        this.proxy.web(req, res);
      });

      this.server.listen(port, () => {
        this.log.info(`NexoWatt EMS proxy running on http://0.0.0.0:${port} -> Admin at ${adminHost}:${adminPort}`);
      });

    } catch (e) {
      this.log.error(`onReady error: ${e.message}`);
    }
  }

  onUnload(callback) {
    try {
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
