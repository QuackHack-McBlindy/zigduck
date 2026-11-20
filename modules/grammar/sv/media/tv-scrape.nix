{
  config,
  lib,
  pkgs,
  ...
} : let
  defaultDir = "/var/lib/zigduck";
in {
  yo.scripts.tv-scrape = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority        = 3;
      fuzzy.enable    = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "skrapa webben efter tv guiden och spara [den] i {wildcard}"
      ];
      lists.dir.wildcard = true;
      lists.wildcard.wildcard = true;

    };

  };}
