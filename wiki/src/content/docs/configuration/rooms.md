---
title: Rooms
description: Declare the rooms your devices, dimmers and automations are grouped by.
---

Rooms group devices. Dimmers control their own room's lights by default, motion sensors light up
their own room, and room automations hook into room events. Each room gets an icon for the
dashboard and widget.

```nix
house = {
  rooms = {
    bedroom.icon    = "mdi:bed";
    hallway.icon    = "mdi:door";
    kitchen.icon    = "mdi:food-fork-drink";
    livingroom.icon = "mdi:sofa";
    wc.icon         = "mdi:toilet";
    tv-area = {
      icon          = "mdi:television";
      # Optional Philips Hue Play HDMI Sync Box integration
      entertainment = true;
    };
  };
};
```

Icons use [Material Design Icons](https://pictogrammers.com/library/mdi/) and need the `mdi:`
prefix.

The room name is the key you use everywhere else: in a device's `room`, under
`house.zigbee.automations.room_actions`, and with `zigduck-cli --room`.

## Options

See [`house.rooms`](../../reference/options/rooms/) in the option reference.
