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
        "{a} (samt|sedan|därefter|slutligen) {b} [och] (samt|sedan|därefter|slutligen) {c} ooh utöver det så {d}"
        "{a} (samt|sedan|därefter|slutligen) {b} [och] (samt|sedan|därefter|slutligen) {c} [och] (samt|sedan|därefter|slutligen) {d}"
        "{a} (samt|sedan) {b} [och] (samt|sedan|därefter|slutligen) {c}"
        "{a} (samt|sedan) {b}"
      ];
      lists = {
        a.wildcard = true;
        b.wildcard = true;
        c.wildcard = true;
        d.wildcard = true;
      };
    };

  };}
