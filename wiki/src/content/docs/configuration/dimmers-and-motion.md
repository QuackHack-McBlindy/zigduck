---
title: Dimmers and motion
description: Tune dimmer switch behavior, motion-triggered lights and the no-motion lights-off rule.
---

Dimmers and motion sensors work without any of this. Use these options only to change the defaults.

```nix
house.zigbee = {
  dimmer = {
    message = "action";

    # Double-clicking cycles through the scenes defined for the dimmer's room.
    doubleClickTimeout = 500; # ms

    # Optional. These defaults match most dimmers.
    # actions = {
    #   onPress   = "on_press_release";
    #   onHold    = "on_hold_release";
    #   upPress   = "up_press_release";
    #   upHold    = "up_hold_release";
    #   downPress = "down_press_release";
    #   downHold  = "down_hold_release";
    #   offPress  = "off_press_release";
    #   offHold   = "off_hold_release";
    # };
  };

  motion = {
    when.dark.enable = true; # on by default
    trigger.lights = {
      # Hours between which motion turns lights on (14:00 to 09:00)
      after = 14;
      before = 9;
      duration = 900;     # seconds without motion before lights turn off
      transition = false; # set true to fade the lights off
    };
  };

  no.motion = {
    trigger.all.lights.off = {
      enable = true; # off by default
      after = 60; # minutes
      # Lights to leave alone, by friendly name
      exclude = [ "Spotlight 1" "Spotlight 2" ];
    };
  };
};
```

## Default dimmer actions

| Button | Press | Hold |
| --- | --- | --- |
| On | Turn on room lights. Press repeatedly to cycle through the room's scenes. | Turn on all lights |
| Up | Increase room brightness | Nothing |
| Down | Decrease room brightness | Nothing |
| Off | Turn off room lights | Turn off all lights |

To change what a button does in a room, use
[dimmer actions](../automations/#dimmer-actions) under `house.zigbee.automations.dimmer_actions`.

## Options

- [`house.zigbee.dimmer`](../../reference/options/zigbee/#dimmer)
- [`house.zigbee.motion`](../../reference/options/zigbee/#motion)
- [`house.zigbee.no.motion`](../../reference/options/zigbee/#nomotion)
