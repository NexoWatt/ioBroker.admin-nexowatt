# ioBroker.admin-nexowatt — NexoWatt EMS (Theme-only)

Deploys a dark-green NexoWatt theme to ioBroker Admin (Admin 7+: `admin.themes/nexowatt`).

## Install
```bash
iobroker stop admin-nexowatt
iobroker url /path/to/iobroker.admin-nexowatt-0.0.4.zip
iobroker upload admin-nexowatt
iobroker restart admin
```
Then in Admin → Settings → Theme select **nexowatt** (if not auto-applied).

## Replace Logo
Upload your logo to: `/opt/iobroker/iobroker-data/files/admin.themes/nexowatt/img/logo.png`
