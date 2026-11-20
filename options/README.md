# **Options**


```bash
zigduck/options/  # <-- You are here.

├── dashboard.nix         # Dashboard card options
├── default.nix           # Aggregates all modules
├── devices.nix           # Zigbee device options
├── https.nix             # TLS / reverse-proxy options
├── media.nix             # Media / TV options
├── presence.nix          # Presence-detection options
├── rooms.nix             # Room definitions
├── service.nix           # systemd service + runtime options
├── tv.nix                # TV configuration options
├── types.nix             # Shared Nix types & helpers
└── zigbee/
    ├── automations.nix   # Automation rules
    ├── coordinator.nix   # Zigbee coordinator options
    ├── default.nix       # Aggregates zigbee/* modules
    ├── devices.nix       # Per-device Zigbee options
    ├── dimmer.nix        # Dimmer switch options
    ├── hue-sync-box.nix  # Hue Sync Box options
    ├── mosquitto.nix     # MQTT broker options
    ├── motion.nix        # Motion-sensor options
    ├── no-motion.nix     # No-motion timeout options
    ├── scenes.nix        # Scene definitions
    └── zigbee.nix        # Core zigbee2mqtt options
```
