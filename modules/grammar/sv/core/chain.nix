{
  config,
  lib,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.chain = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      priority = 5;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "{a} samt {b} samt {c} samt {d}"
        "{a} samt {b} samt {c}"
        "{a} samt {b}"
      ];
      lists = {
        a.wildcard = true;
        b.wildcard = true;
        c.wildcard = true;
        d.wildcard = true;
      };
    };

  };}
