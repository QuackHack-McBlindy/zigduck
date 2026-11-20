{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {

  yo.scripts.scene = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 2;
      sentences = [
        "(activate|set|run|turn on) scene {name}"
        "(activate|set|run|turn on) the scene {name}"
        "(activate|set|run|turn on) living ceiling scene {name}"
        "(activate|set|run|turn) [on] the living ceiling scene {name}"
        "(activate|set|run|turn) [on] green scene {name}"
        "(activate|set|run|turn) [on] the green scene {name}"
        "(activate|set|run|turn) [on] kitchen scene {name}"
        "(activate|set|run|turn) [on] the scene {name} kitchen"
      ];
      lists.name.values = en.scenes;
    };

  };}
