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
        stateEndpoint = lib.mkOption {
           type = lib.types.nullOr lib.types.str;
           description = ''
             State JSON endpoint — extension refetches this after every control
             action so the frontend reflects the new value immediately
             without waiting for the next MQTT publish.
           '';
           example = "/api/sensors";
           default = null;
        };
        controls = mkOption {
          type = types.attrsOf (types.submodule {
            options = {
              type = mkOption {
                type = types.enum [ "bool" "slider" "sensor" ];
                example = "slider";
                description = "Widget type rendered in the frontend.";
              };
              description = mkOption {
                type = lib.types.nullOr lib.types.str;
                example = "Control the display brightness.";
                default = null;
                description = "Optional description of this control action.";
              };
              icon = mkOption {
                type = types.str;
                default = "mdi:duck";
                description = "Material Design icon name representing this state/value.";
              };
              min = mkOption {
                type = types.int;
                default = 0;
                description = "Minimum value";
              };
              max = mkOption {
                type = types.int;
                default = 100;
                description = "Maximum value";
              };
              values = mkOption {
                type = types.listOf types.str;
                default = [ ];
                description = "List of allowed values, restricting this control action to only send one of these values.";
              };
              actions = mkOption {
                type    = types.listOf Types.automationActionType;
                default = [];
                description = ''
                  Actions executed when this control changes. The new value is
                  available as `$VALUE` (and as `{value}` inside non-shell
                  actions). `$KEY`, `$DEVICE`, `$IP` and `$MQTT_PAYLOAD`
                  are also set. Leave empty for read-only `sensor` controls.
                '';
                example = [
                  {
                    type = "shell";
                    command = '''
                      curl -s -X POST "http://$IP/api/settings/mic/volume/$VALUE"
                    '';
                  }
                ];
              };
            };
          });
          default = { };
          description = ''
            Define custom controls surfaced as widgets in the GNOME panel detail view.
            Each key is a field name present in the state JSON file.
          '';
        };
      };
    });
    default = { };

  };}
