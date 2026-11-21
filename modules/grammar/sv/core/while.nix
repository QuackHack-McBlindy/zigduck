{
  config,
  lib,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.while = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "(medan|medans) {condition} (så|gör) {body}"
        "loopa (medan|medans) {condition} (så|gör) {body}"
        "upprepa {body} (medan|medans) {condition}"
        "(medan|medans) {condition} (så|gör) {body} var {every} sekund"
        "(medan|medans) {condition} (så|gör) {body} max {max_minutes} minuter"
      ];

      lists = {
        condition.wildcard = true;
        body.wildcard      = true;
        every.values       = sv.numberFromOneTo 59;
        max_minutes.values = sv.numberFromOneTo 59;
      };
    };

  };}
