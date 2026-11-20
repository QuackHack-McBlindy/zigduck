{
  self,
  lib,
  config,
  pkgs,
  ...
} : let
in { # 🦆 says ⮞ yo
  yo.scripts.tv-guide = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      sentences = [
        # 🦆 says ⮞ program search sentences
        "which channel (is playing|is showing|is airing|is running|is) {search} on"
        "kick off (live|livetv|live-tv|livestream) [tv] {search} [fast|quick] [as] [hell]"
        # 🦆 says ⮞ channel specific sentences
        "what (is airing|is showing|is playing|is running) on [channel] {channel} [right now]"

        # 🦆 says ⮞ show all currently airing programs
        "(tv-guide|tvguide)"
        "show [me] [the tv] (tv-schedule|the tv-schedule|tv-guide|the tv-guide|guide|the guide|schedule|the schedule)"
        "show [me] the tv schedule"
        "what (shows|is showing|is airing|is running|is playing) on tv [right] [now]"
      ];
      lists = {
        channel.values = lib.flatten (map (device:
            lib.mapAttrsToList (id: channel: {
                "in" = "[${channel.name}|${id}]";
                out = id;
            }) device.channels
        ) (lib.attrValues (builtins.removeAttrs config.house.tv [ "privateKeyFile" "publicKey" ])));
        search.wildcard = true;
      };
    };
  };}
