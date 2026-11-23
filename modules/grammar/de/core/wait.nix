{
  config,
  lib,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.wait = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
      sentences = [
        "warte {seconds}"
      ];

      lists = {
        seconds.values = de.numberFromOneTo 59;
      };
    };

  };}
