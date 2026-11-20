# dotfiles/bin/media/tv-guide.nix
{ # 🦆 says ⮞ Fancy markdown & Text-To-Speech EPG in da terminal!
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let
in { # 🦆 says ⮞ yo
  yo.scripts.tv-guide = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      sentences = [
        # 🦆 says ⮞ program search sentences
        "vilken kanal (spela|spelas|sänds|går|är) {search} på"
        "släng igång (live|livetv|live-tv|lajv|lajvtv) [tv]  {search} [för|fort] [som] [fan]"
        # 🦆 says ⮞ channel specific sentences
        "vad (sänds|visas|spelas|går) på [kanal] {channel} [just nu]"

        # 🦆 says ⮞ show all currently airing programs
        "(tv-guide|tvguide)"
        "visa [mig] [tv] (tv-tablå|tv-tablån|tv-guide|tv-guiden|guide|guiden|tablån)"
        "visa [mig] tv tablån"
        "vad (visa|visas|går|sänds|spelas) på tv [just] [nu]"
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
