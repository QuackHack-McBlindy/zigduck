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
          example = false;
        };
        room = lib.mkOption {
          type = lib.types.enum (lib.attrNames config.house.rooms);
          example = "livingroom";
          description = "Room where this device is located";
        };
        icon = mkOption {
          type = types.str;
          default = "mdi:duck";
          example = "mdi:toilet";
          description = "Material Design icon name representing this device.";
        };
        ip = lib.mkOption {
          type = lib.types.str;
          example = "192.168.1.210";
          description = "Device IP address";
        };

        state = mkOption {
          type = lib.types.submodule {
            options = {
              endpoint = lib.mkOption {
                type = lib.types.nullOr lib.types.str;
                description = ''
                  State endpoint — must return JSON data.
                  Zigduck refetches this after every control
                  action so the frontend reflects the new value immediately
                  without waiting for the next MQTT publish.
                '';
                example = "/api/sensors";
                default = null;
              };

              refresh = lib.mkOption {
                type = lib.types.nullOr lib.types.ints.positive;
                default = null;
                example = 45;
                description = ''
                  Interval, in seconds, between automatic refreshes of the JSON
                  fetched from `state.endpoint`.

                  Set to `null` to disable automatic polling — the endpoint will
                  then only be fetched on demand (e.g. immediately after a
                  control action is triggered from the frontend).
                '';
              };
            };
          };
          default     = { };
          description = "State endpoint configuration for this device.";
          example     = {
            endpoint  = "/api/sensors";
            refresh   = 60;
          };
        };

        controls = mkOption {
          type      = types.attrsOf (types.submodule {
            options = {
              type  = mkOption {
                type        = types.enum [ "bool" "slider" "sensor" ];
                example     = "slider";
                description = "Widget type rendered in the frontend.";
              };
              description = mkOption {
                type        = lib.types.nullOr lib.types.str;
                example     = "Control the display brightness.";
                default     = null;
                description = "Optional description of this control action.";
              };
              icon = mkOption {
                type = types.str;
                default = "mdi:duck";
                example = "mdi:toilet";
                description = "Material Design icon name representing this state/value.";
              };
              min = mkOption {
                type = types.int;
                default = 0;
                example = 0;
                description = "Minimum value";
              };
              max = mkOption {
                type = types.int;
                default = 100;
                example = 1000;
                description = "Maximum value";
              };
              values = mkOption {
                type = types.listOf types.str;
                default = [ ];
                example = [ "0" "1" "10" "20" ];
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
            Each key is a field name present at Mosquitto BASE_TOPIC/<device_name>.
          '';
        };
      };
    });
    default = { };

  };}
