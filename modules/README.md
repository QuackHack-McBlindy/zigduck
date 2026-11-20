# **Modules**


```bash
zigduck/modules/  # <-- You are here.
│
├── assertions.nix        # NixOS config assertions (cross-module validation)
├── cards.nix             # Status-card themes + style generator
├── dashboard.nix         # Web dashboard builder (HTML, CSS, JSON, icons, TV icons)
├── default.nix           # Module entry point – imports everything below
├── helpers.nix           # Shared helper functions
├── tv.nix                # TV / media-related Nix wiring
├── zigduck.nix           # Top-level `house.*` option declaration + systemd wiring
│
├── grammar/  # Multilingual voice grammar
│   ├── default.nix
│   ├── lib.nix
│   └── {de,en,es,fr,sv}/…
│
└── scripts/    # Declarative "yo" shell scripts
    ├── default.nix
    ├── core/    # automate, chain, if, until, while
    ├── media/   # tv, tv-guide, tv-scrape
    ├── misc/    # alarm, timer
    └── zigbee/  # house
```
