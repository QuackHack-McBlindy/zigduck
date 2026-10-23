---
title: Scenes
description: Save light states as named scenes to activate from dimmers, automations, the CLI or the dashboard.
---

A scene sets one or more lights, by friendly name, to a given state.

```nix
house.zigbee.scenes = {
  "Scene name" = {
    "Spotlight 1" = {
      state = "ON";
      brightness = 200;
      color = { hex = "#00FF00"; };
    };
    "Spotlight 2" = {
      state = "OFF";
      transition = 100;
    };
    # ... more lights
  };
};
```

Scenes that include lights in a room become part of that room's scene cycle: pressing a dimmer's On
button repeatedly steps through them.

## Activating a scene

- From the terminal: `zigduck-cli --scene "Scene name"`, optionally with `--room kitchen`
- In an automation: `{ type = "scene"; scene = "Scene name"; }`
- Over the API: `POST /api/scene/{scene}`
- From the dashboard or the GNOME extension

## Options

See [`house.zigbee.scenes`](../../reference/options/zigbee/) in the option reference.
