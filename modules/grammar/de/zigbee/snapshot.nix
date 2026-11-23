{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {

  yo.scripts.snapshot = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
      sentences = [
        "{action} [einen] (Snap|Snapshot|Schnappschuss|Systembild|Bild) [vom] [System] [und] (benenne|nenne) ihn [in] {name} um"
        "{action} [das] (System|System|die Lampen) [um] {name}"
      ];
      lists = {
        action.values = [
          { "in" = "erstell|erstelle|mach|fertige an|richte ein";   out = "create"; }
          { "in" = "stelle wieder her|setze zurück|baue wieder auf|ursprünglich|kehre zurück|rekonstruiere"; out = "restore"; }
        ];
        name.wildcard = true;
      };
    };

  };}
