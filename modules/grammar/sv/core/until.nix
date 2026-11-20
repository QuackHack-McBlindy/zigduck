{
  self,
  lib,
  config,
  pkgs,
  ...
} : let

in {
  yo.scripts.until = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;

      sentences = [
        "tills {condition} gör {body}"
        "loopa tills {condition} gör {body}"
        "upprepa {body} tills {condition}"

        "kör {body} varje {every} sekund tills {condition}"
        "upprepa {body} med {every} sekunders mellanrum tills {condition}"

        "kör {body} i högst {max_minutes} minuter tills {condition}"
        "upprepa {body} under maximalt {max_minutes} minuter tills {condition}"
      ];

      lists = {
        condition = { wildcard = true; values = []; };
        body      = { wildcard = true; values = []; };
        every.values = [
          { "in" = "1|en";       out = "1"; }
          { "in" = "5|fem";      out = "5"; }
          { "in" = "10|tio";     out = "10"; }
          { "in" = "15|femton";  out = "15"; }
          { "in" = "30|trettio"; out = "30"; }
          { "in" = "60|sextio";  out = "60"; }
        ];
        max_minutes.values = [
          { "in" = "1|en";       out = "1"; }
          { "in" = "5|fem";      out = "5"; }
          { "in" = "10|tio";     out = "10"; }
          { "in" = "15|femton";  out = "15"; }
          { "in" = "30|trettio"; out = "30"; }
          { "in" = "60|sextio";  out = "60"; }
        ];
      };
    };

  };}
