---
title: Lights and devices
description: Define Zigbee lights, dimmers, sensors and blinds, plus read-only non-Zigbee devices.
sidebar:
  label: Lights and devices
---

## Zigbee devices

Each Zigbee device is keyed by its 64-bit IEEE address. Give it a friendly name, a room and a type,
and zigduck's defaults take care of the rest. A dimmer or motion sensor controls its own room unless
you override it.

```nix
house.zigbee.devices = {
  "0x0016830103ba7e95" = { # 64-bit IEEE address, the unique device ID
    friendly_name = "Dimmer Switch Kitchen"; # human-readable name
    room = "kitchen"; # bind to a room
    type = "dimmer";
    endpoint = 1; # Zigbee endpoint
    icon = "mdi:toggle-switch"; # shown on the dashboard and widget
    batteryType = "CR2450"; # optional, shown in the widget
  };
  "0x0017880402750848a" = {
    friendly_name = "Spotlight 1";
    room = "kitchen";
    type = "light";
    icon = "mdi:spotlight";
    supports_temperature = true;
    endpoint = 11;
  };
  "00178801095f06300b" = {
    friendly_name = "TV Play Strip";
    room = "tv-area";
    type = "hue_light";
    icon = "mdi:light-strip";
    endpoint = 1;
    supports_color = true;
    hue_id = 38;
  };
  "0x54ef4410003e58e2" = {
    friendly_name = "Roller Shade";
    room = "livingroom";
    type = "blind";
    icon = "mdi:blinds";
    endpoint = 1;
  };
  "0x00178801021311c4" = {
    friendly_name = "Motion Sensor Hall";
    room = "hallway";
    type = "motion";
    icon = "mdi:motion-sensor";
    endpoint = 1;
    batteryType = "AAA";
  };
  "0x00158d00053ec9b1" = {
    friendly_name = "Door Sensor Hall";
    room = "hallway";
    type = "sensor";
    icon = "mdi:door";
    endpoint = 1;
  };
};
```

### Device types

| Type | Use it for |
| --- | --- |
| `light` | Zigbee bulbs, spots and strips paired to your coordinator |
| `hue_light` | Lights paired to a Philips Hue Bridge. Set `hue_id` to the bridge's light ID. |
| `dimmer` | Dimmer switches. See [Dimmers and motion](../dimmers-and-motion/). |
| `motion` | Motion sensors |
| `sensor` | Door, contact, temperature, leak and smoke sensors |
| `blind` | Roller shades and blinds |
| `outlet` | Smart plugs |
| `remote` | Remotes |
| `pusher` | Button pushers |
| `custom` | Anything else |

The friendly name is how you refer to the device in scenes, automations and `zigduck-cli --device`.

## Non-Zigbee devices

You can also define devices that aren't on Zigbee, such as NixOS hosts or ESP32 hardware. These
are read-only by default, but you can add controls that run actions.

```nix
house.devices = {
  "ESP32-S3" = {
    enable = true;
    room   = "other";
    icon   = "mdi:watch";
    ip     = "192.168.1.111";

    stateEndpoint = "/api/sensors";

    # Controls show up in the frontend and can be used in automations.
    # Publish the device's payload to "zigduck/watch" to show it in the frontend.
    controls = {
      # Moving the "brightness" slider publishes to "zigduck/watch/set"
      # and runs the actions below.
      brightness = {
        type        = "slider";
        icon        = "mdi:brightness-6";
        min         = 0;
        max         = 100;
        description = "Controls the display backlight brightness level";
        actions     = [ { type = "shell"; command = "curl http://$IP/api/settings/display/brightness/$VALUE"; } ];
      };
    };
  };
};
```

Inside control actions, `$VALUE` holds the new value. `$KEY`, `$DEVICE`, `$IP` and `$MQTT_PAYLOAD`
are also set.

A NixOS host can publish JSON health data to `zigduck/<name>` (for example `zigduck/desktop`) and
zigduck will show it.

## Options

- [`house.zigbee.devices`](../../reference/options/zigbee/#devices)
- [`house.devices`](../../reference/options/devices/)
