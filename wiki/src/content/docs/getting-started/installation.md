---
title: Installation
description: Add the zigduck flake to your NixOS configuration and enable the service.
---

zigduck ships as a NixOS module in a flake. You need a NixOS system configured with flakes.

## 1. Add zigduck to your flake inputs

```nix title="flake.nix"
inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  zigduck.url = "github:quackhack-mcblindy/zigduck";
};
```

## 2. Import the module

```nix
imports = [
  zigduck.nixosModules.zigduck
];
```

The module also needs `self` and `inputs` as module arguments. Pass them to `nixosSystem` through
`specialArgs`:

```nix title="flake.nix"
nixosSystem {
  specialArgs = { inherit self inputs; };
  # ...
}
```

## 3. Enable the services

```nix
services.zigduck = {
  enable = true;
  cli.enable = true;

  # Install the GNOME Shell extension for a top bar widget.
  # Turn it on afterwards with:
  #   gnome-extensions enable zigduck@quackhack-mcblindy.com
  gnomeExtension.enable = true;

  dashboard = {
    enable = true;
    # Set to false if you serve the dashboard over plain HTTP (not recommended).
    secure = true;
    port = 13336;
    openFirewall = true;
    passwordFile = config.sops.secrets.dashboard.path;
  };
};
```

:::caution
For security, serve the dashboard through a reverse proxy such as Nginx, Caddy or Traefik rather
than exposing the port directly.
:::

The examples on this site use [sops-nix](https://github.com/Mic92/sops-nix) for secrets
(`config.sops.secrets.*.path`). Any option ending in `File` takes a path, so agenix or a plain file
outside the Nix store works too.

## Next steps

- Copy the [quick start config](../quick-start/) and edit it for your house.
- Read through the configuration pages, starting with [Zigbee](../../configuration/zigbee/).
- See every `services.zigduck` option in the [option reference](../../reference/options/service/).
