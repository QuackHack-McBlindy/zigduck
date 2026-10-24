---
title: Zigbee
description: Network key, coordinator, Mosquitto broker and the optional Philips Hue Sync Box.
---

Everything Zigbee lives under `house.zigbee`. At minimum you need a network key, a coordinator and
an MQTT broker.

```nix
house = {
  zigbee = {
    # Zigbee devices join the network with this encryption key.
    # If you lose or change it, every device must be re-paired.
    # Without it there's no reproducibility.
    networkKeyFile = config.sops.secrets.z2m_network_key.path;

    # The coordinator USB stick
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
  };
};
```

:::tip
Find your coordinator's `vendorId` and `productId` with `lsusb`. The pair after `ID` is
`vendorId:productId`.
:::

## Philips Hue Sync Box (optional)

zigduck can drive a Philips Hue Play HDMI Sync Box. The Sync Box needs a Hue Bridge, and Hue
devices on the bridge are still fully integrated.

```nix
house.zigbee.hueSyncBox = {
  enable = true;
  syncBox = {
    ip = "192.168.1.34";
    passwordFile = config.sops.secrets.hueBridgeAPI.path;
    tv = "shield";
  };
  bridge = {
    ip = "192.168.1.33";
    # Fetch an API token with:
    # curl -X POST http://192.168.1.33/api -d '{"devicetype":"house#nixos"}'
    passwordFile = config.sops.secrets.hueBridgeAPI.path;
  };
};
```

Mark the rooms the Sync Box should light with `entertainment = true`. See [Rooms](../rooms/).

## Options

- [`house.zigbee` options](../../reference/options/zigbee/), including `coordinator`, `mosquitto`, `hueSyncBox`, `dataDir` and `settings`
- [`services.zigduck.broker`](../../reference/options/service/) sets the broker the zigduck service connects to
