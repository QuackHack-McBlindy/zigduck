{
  config,
  lib,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.wait = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "(wait|sleep) {seconds}"
      ];

      lists = {
        seconds.values = en.numberFromOneTo 59;
      };
    };

  };}
