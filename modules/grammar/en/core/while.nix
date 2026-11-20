{
  config,
  lib,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.while = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;

      sentences = [
        "while {condition} (then|do) {body}"
        "loop while {condition} (then|do) {body}"
        "repeat {body} while {condition}"
        "while {condition} (then|do) {body} every {every} seconds"
        "while {condition} (then|do) {body} for a maximum of {max_minutes} minutes"
      ];

      lists = {
        condition.wildcard = true;
        body.wildcard      = true;
        every.values       = en.numberFromOneTo 59;
        max_minutes.values = en.numberFromOneTo 59;
      };
    };

  };}
