{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {

  yo.scripts.scene = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority = 2;
      sentences = [
        "(aktivera|sätt|kör|tänd) scen {name}"
        "(aktivera|sätt|kör|tänd) scenen {name}"
        "(aktivera|sätt|kör|tänd) scen levande tak {name}"
        "(aktivera|sätt|kör|tänd) scenen levande tak {name}"
        "(aktivera|sätt|kör|tänd) scen green {name}"
        "(aktivera|sätt|kör|tänd) scenen green {name}"
        "(aktivera|sätt|kör|tänd) scen köket {name}"
        "(aktivera|sätt|kör|tänd) scenen {name} köket"
      ];
      lists.name.values = sv.scenes;
    };

  };}
