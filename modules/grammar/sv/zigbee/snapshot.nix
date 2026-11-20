{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {

  yo.scripts.snapshot = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority = 4;
      sentences = [
        "{action} [en] (snap|snapp|snapshot|ögonblicksbild|systembild|bild) [av] [system|systemet] [och] (döp|namnge) den [till] [innan] {name}"
        "{action} [en] (system|systemet|lamporna) till [innan] {name}"
      ];
      lists = {
        action.values = [
          { "in" = "skap|skapa|gör|fixa|greja";   out = "create"; }
          { "in" = "återskapa|återställ|återuppbygga|ursprungligt|returnera|rekonstruera"; out = "restore"; }
        ];
        name.wildcard = true;
      };
    };

  };}
