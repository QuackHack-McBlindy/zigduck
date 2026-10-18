{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
  Types = import ./types.nix { inherit lib; };
in {
  options.house.devices = mkOption {
    type = lib.types.attrsOf (lib.types.submodule {
      options = {
        enable = lib.mkOption {
          type = lib.types.bool;
          default = true;
          description = "Enables this device to be monitored.";
        };
        room = lib.mkOption {
          type = lib.types.enum (lib.attrNames config.house.rooms);
          description = "Room where this device is located";
        };
        icon = mkOption {
          type = types.str;
          default = "mdi:duck";
          description = "Material Design icon name representing this device.";
        };
        ip = lib.mkOption {
          type = lib.types.str;
          description = "Device IP address";
        };
      };
    });
    default = {};

  };}
