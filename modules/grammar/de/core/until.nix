{
  self,
  lib,
  config,
  pkgs,
  ...
} : let

in {
  yo.scripts.until = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "bis {condition}, führe {body} aus"
        "wiederhole, bis {condition}; führe {body} aus"
        "wiederhole {body}, bis {condition}"

        "führe {body} alle {every} Sekunden aus, bis {condition}"
        "wiederhole {body} im Abstand von {every} Sekunden, bis {condition}"

        "führe {body} höchstens {max_minutes} Minuten lang aus, bis {condition}"
        "wiederhole {body} maximal {max_minutes} Minuten lang, bis {condition}"
      ];

      lists = {
        condition = { wildcard = true; values = []; };
        body      = { wildcard = true; values = []; };
        every.values = [
          { "in" = "1|eins";       out = "1"; }
          { "in" = "5|fünf";      out = "5"; }
          { "in" = "10|zehn";     out = "10"; }
          { "in" = "15|fünfzehn";  out = "15"; }
          { "in" = "30|dreißig"; out = "30"; }
          { "in" = "60|sechzig";  out = "60"; }
        ];
        max_minutes.values = [
          { "in" = "1|eins";       out = "1"; }
          { "in" = "5|fünf";      out = "5"; }
          { "in" = "10|zehn";     out = "10"; }
          { "in" = "15|fünfzehn";  out = "15"; }
          { "in" = "30|dreißig"; out = "30"; }
          { "in" = "60|sechzig";  out = "60"; }
        ];
      };
    };

  };}
