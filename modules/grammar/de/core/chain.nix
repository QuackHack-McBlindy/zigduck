{
  config,
  lib,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.chain = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "{a} (und|dann|danach|schließlich) {b} [und] (und|dann|danach|schließlich) {c} und zusätzlich {d}"
        "{a} (und|dann|danach|schließlich) {b} [und] (und|dann|danach|schließlich) {c} [und] (und|dann|danach|schließlich) {d}"
        "{a} (und|dann) {b} [und] (und|dann|danach|schließlich) {c}"
        "{a} (und|dann) {b}"
      ];
      lists = {
        a.wildcard = true;
        b.wildcard = true;
        c.wildcard = true;
        d.wildcard = true;
      };
    };

  };}
