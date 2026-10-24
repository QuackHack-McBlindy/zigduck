---
title: Quick start
description: A complete minimal house configuration to copy and adapt.
---

This config defines five rooms, a Zigbee coordinator, an MQTT broker and three devices: a dimmer, a
light and a motion sensor. With smart defaults that's enough for the dimmer to control the kitchen
and the motion sensor to light up the hallway.

Replace the USB IDs, IP address, IEEE addresses and secrets with your own.

```nix
{
  services.zigduck = {
    enable = true;
    cli.enable = true;
    dashboard.enable = true;
    dashboard.port = 13336;
    dashboard.openFirewall = true;
    dashboard.passwordFile = config.sops.secrets.api.path;
    # Plain HTTP for a first test. Use true behind an HTTPS reverse proxy.
    dashboard.secure = false;
  };

  house = {
    rooms = {
      bedroom.icon    = "mdi:bed";
      hallway.icon    = "mdi:door";
      kitchen.icon    = "mdi:food-fork-drink";
      livingroom.icon = "mdi:sofa";
      wc.icon         = "mdi:toilet";
    };

    zigbee = {
      # Zigbee devices join the network with this encryption key.
      # If you lose or change it, every device must be re-paired.
      # Without it there's no reproducibility.
      networkKeyFile = config.sops.secrets.z2m_network_key.path;

      # The coordinator USB stick.
      coordinator = {
        vendorId  = "10c3"; # USB identifiers
        productId = "ea61";
        symlink   = "zigbee"; # symlinks the USB port as /dev/zigbee
      };

      mosquitto = {
        host = "192.168.1.110";
        username = "duckmqtt";
        passwordFile = config.sops.secrets.mosquitto.path;
      };

      devices = {
        "0x0016830103ba7e95" = { # 64-bit IEEE address, the unique device ID
          friendly_name = "Dimmer Switch Kitchen";
          room = "kitchen";
          type = "dimmer"; # light, hue_light, dimmer, motion, sensor, blind, ...
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

        "0x00178801021311c4" = {
          friendly_name = "Motion Sensor Hall";
          room = "hallway";
          type = "motion";
          icon = "mdi:motion-sensor";
          endpoint = 1;
          batteryType = "AAA";
        };
      };

      motion = {
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
        };
      };
    };
  };
}
```

## Pairing devices

Put the network in pairing mode for two minutes and watch for new devices:

```sh
zigduck-cli --pair 120 --watch
```

Copy each new device's IEEE address into `house.zigbee.devices` and rebuild.
