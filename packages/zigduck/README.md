# **zigduck**


```bash
zigduck/
├── main.rs              # entrypoint, spawns state + MQTT listener
├── state.rs             # ZigduckState (cloneable, Arc-shared internals)
├── config/              # config.json schema (HouseConfig)
├── domain/              # automations, devices, scenes, dashboard types
├── automations/         # action execution, conditions, triggers, presence
├── devices/             # device commands, house controls, state updates
├── mqtt/                # listener + message router
├── dimmer/              # dimmer switch handling, double-click, scene cycling
├── lights/              # room / global light helpers
├── scenes/              # scene activation (alias-resolved, room-filtered)
├── snapshots/           # save & restore device state
├── motion/              # motion tracker + no-motion global check
├── presence/            # network-probe + door/motion presence state machine
├── scheduler.rs         # periodic checks (no-motion, presence, time-based)
├── hue/                 # Hue bridge client + payload conversion
├── net.rs               # reachability probe (ping → arp → tcp)
└── tv.rs                # TV channel state tracking (via config)
```
