{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.until = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;

      sentences = [
        "until {condition} do {body}"
        "loop until {condition} do {body}"
        "repeat {body} until {condition}"

        "run {body} every {every} seconds until {condition}"
        "repeat {body} at {every}-second intervals until {condition}"

        "run {body} for at most {max_minutes} minutes until {condition}"
        "repeat {body} for a maximum of {max_minutes} minutes until {condition}"
      ];

      lists = {
        condition.wildcard = true;
        body.wildcard      = true;
        every.values       = en.numberFromOneTo 59;
        max_minutes.values = en.numberFromOneTo 59;
      };
    };

  };}
