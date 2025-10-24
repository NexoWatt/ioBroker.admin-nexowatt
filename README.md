
# ioBroker.admin-nexowatt — NexoWatt EMS (Standalone Proxy)

This adapter runs a small HTTP proxy on its own port (default **8181**) and injects
NexoWatt dark-green styling into the ioBroker Admin UI (default at **8081**).

## Usage
- Open: `http://<host>:8181` (not 8081)
- The proxy forwards to Admin and injects `/__nexowatt__/nexowatt.css` and `nexowatt.js`

## Config (instance settings)
- `port`: external port for this theme proxy (default 8181)
- `adminHost`: Admin host (default 127.0.0.1)
- `adminPort`: Admin port (default 8081)
