{
  lib,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
  Types = import ./types.nix { inherit lib; };
in {
  options.house.presence = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      example = false;
      description = ''
        Enabling this makes Zigduck home/away aware.
        Priority order is first probes (WiFi based presence).
        Second is door sensor (if last motion was detected while door opened and closed).
        Lastly it checks any Zigbee devices occupancy for any motion.
      '';
    };

    probes = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ ];
      example = [ "192.168.1.182" "192.168.1.100:22" ];
      description = ''
        IPs or `host:port` that indicate presence when reachable.
        If any probe answers, the Zigduck presence state is considered `home` regardless of
        motion or door state. Defaults to port 80 when no port is given.
        A TCP connection that is refused also counts as reachable — it proves
        the device is on the LAN, even if nothing is listening.
      '';
    };

    probeInterval = lib.mkOption {
      type = lib.types.ints.positive;
      default = 180;
      description = "Seconds between probe checks.";
    };

    probeTimeout = lib.mkOption {
      type = lib.types.ints.positive;
      default = 2;
      example = 1;
      description = "Seconds before a probe attempt is considered a timeout (unreachable).";
    };

    homeActions = mkOption {
      type    = types.listOf Types.automationActionType;
      default = [ ];
      description = ''
        Actions executed when the presence state transitions to `home`
        (i.e. when you arrive). Shell actions receive
        `$PRESENCE_STATE=home` and `$PRESENCE_OLD_STATE=away` in their env.
      '';
      example = [
        { type = "scene"; scene = "evening"; }
        { type = "shell"; command = "zigduck-cli --notify '🏠 Welcome home'"; }
      ];
    };

    awayActions = mkOption {
      type    = types.listOf Types.automationActionType;
      default = [ ];
      description = ''
        Actions executed when the presence state transitions to `away`
        (i.e. when you leave). Shell actions receive
        `$PRESENCE_STATE=away` and `$PRESENCE_OLD_STATE=home` in their env.
      '';
      example = [
        { type = "mqtt"; topic = "home/alarm"; message = "arm"; }
        { type = "shell"; command = "zigduck-cli --notify '👋 Goodbye'"; }
      ];
    };

  };}
