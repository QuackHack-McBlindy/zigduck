{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
in {

  options.house.zigbee.mosquitto = mkOption {
    type = types.nullOr (types.submodule {
      options = {
        host = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "IP address of the host running Mosquitto";
          example = "192.168.1.211";
        };
        username = mkOption {
          type = types.nullOr types.str;
          default = null;
          example = "mqtt-user";
          description = "MQTT username for authentication";
        };
        passwordFile = mkOption {
          type = types.nullOr types.path;
          default = null;
          example = "/run/secrets/mosquitto";
          description = "Path to file containing MQTT password";
        };
        baseTopic = mkOption {
          type = types.str;
          default = "zigbee2mqtt";
          example = "zigduck";
          description = "MQTT base topic used by Zigbee2mqtt and the zigduck runtime.";
        };
        whitelist = mkOption {
          type = types.listOf types.str;
          default = [];
          example = [ "special_key" "device_state" ];
          description = "Optional list of additional JSON fields to include in states.json";
        };
        ssl = {
          enable = mkEnableOption "Enable SSL/TLS for MQTT connection";
          caCertFile = mkOption {
            type = types.nullOr types.path;
            default = null;
            description = "Path to CA certificate file";
          };
          clientCertFile = mkOption {
            type = types.nullOr types.path;
            default = null;
            description = "Path to client certificate file";
          };
          clientKeyFile = mkOption {
            type = types.nullOr types.path;
            default = null;
            description = "Path to client private key file";
          };
        };
      };
    });

  };}
