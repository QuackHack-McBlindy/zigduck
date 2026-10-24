{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption mkEnableOption types;
  cfg = config.services.zigduck;
  Types = import ./types.nix { inherit lib; };
in {

  options.services.zigduck = {
    enable = mkEnableOption "Zigduck";

    # zigduck service options
    broker = mkOption {
      type = types.str;
      default = "127.0.0.1";
      example = "0.0.0.0";
      description = "MQTT broker hostname or IP address";
    };

    stateDir = mkOption {
      type = types.path;
      default = "/var/lib/zigduck";
      example = "/path/to/example";
      description = "Directory for runtime state files";
    };

    debug = mkOption {
      type = types.bool;
      default = false;
      example =  true;
      description = "Enable debug logging (sets DEBUG=1)";
    };

    logFile = mkOption {
      type = types.path;
      default = cfg.stateDir + "/zigduck.log";
      example = "/path/to/example/zigduck.log";
      description = "Location to store zigduck logfile.";
    };

    extraEnv = mkOption {
      type = types.attrsOf types.str;
      default = {};
      description = "Extra environment variables to pass to the service";
    };

    # zigduck-dashboard servoce options
    dashboard = {
      enable = mkEnableOption "Zigduck dashboard service";
      host = mkOption {
        type = types.str;
        default = "0.0.0.0";
        example = "127.0.0.1";
        description = "Host to bind the webserver to";
      };
      port = mkOption {
        type = types.port;
        default = 13336;
        example = 13337;
        description = "Port for the dashboard";
      };
      openFirewall = mkOption {
        type = types.bool;
        default = false;
        example = true;
        description = "Whether to open the firewall for the specified port.";
      };
      passwordFile = mkOption {
        type = types.nullOr types.path;
        default = null;
        description = "Path to password file for API authentication (API_PASSWORD_FILE)";
      };
      secure = mkOption {
        type = types.bool;
        default = true;
        example = false;
        description = "Whether to set the Secure flag on authentication cookies. Set to false when serving over plain HTTP.";
      };
      logFile = mkOption {
        type = types.path;
        default = cfg.stateDir + "/zigduck-api.log";
        example = "/path/to/example/zigduck-api.log";
        description = "Location to store zigduck API logfile.";
      };
    };


    # zigduck-cli options
    cli = {
      enable = mkOption {
        type = types.bool;
        default = true;
        example = false;
        description = "Whether to install zigduck-cli package.";
      };
    };

    # gnome-shell extension options
    gnomeExtension = {
      enable = mkOption {
        type = types.bool;
        default = false;
        example = true;
        description = "Whether to install gnome-shell-extension zigduck package.";
      };
    };

  };}
