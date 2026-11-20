{
  config,
  lib,
  swe,
  pkgs,

  ...
} : let
  defaultDir = "/var/lib/zigduck";
in {
  yo.scripts.tv-scrape = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority        = 3;
      fuzzy.enable    = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "scrape the web for the tv guide and save [it] in {wildcard}"
      ];
      lists.dir.wildcard = true;
      lists.wildcard.wildcard = true;

    };

  };}
