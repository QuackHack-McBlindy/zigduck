{
  config,
  lib,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.wait = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "vänta {seconds}"
      ];

      lists = {
        seconds.values = sv.numberFromOneTo 59;
      };
    };

  };}
