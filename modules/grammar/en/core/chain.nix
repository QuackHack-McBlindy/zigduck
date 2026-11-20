{
  config,
  lib,
  pkgs,
  en,
  ...
}: let

in {
  yo.scripts.chain = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 5;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;

      sentences = [
        "{a} also {b} also {c} also {d}"
        "{a} also {b} also {c}"
        "{a} also {b}"
      ];

      lists = {
        a.wildcard = true;
        b.wildcard = true;
        c.wildcard = true;
        d.wildcard = true;
      };
    };

  };}
