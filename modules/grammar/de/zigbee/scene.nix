{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {

  yo.scripts.scene = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
      sentences = [
        "(aktiviere|stelle ein|starte|schalte ein) Szene {name}"
        "(aktiviere|stelle ein|starte|schalte ein) die Szene {name}"
        "(aktiviere|stelle ein|starte|schalte ein) die Szene lebendige Decke {name}"
        "(aktiviere|stelle ein|starte|schalte ein) die Szene lebendige Decke {name}"
        "(aktiviere|stelle ein|starte|schalte ein) Szene Green {name}"
        "(aktiviere|stelle ein|starte|schalte ein) die Szene Green {name}"
        "(aktiviere|stelle ein|starte|schalte ein) Szene Küche {name}"
        "(aktiviere|stelle ein|starte|schalte ein) die Szene {name} Küche"
      ];
      lists.name.values = de.scenes;
    };

  };}
