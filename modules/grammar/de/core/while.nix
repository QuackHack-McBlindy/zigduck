{
  config,
  lib,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.while = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
      sentences = [
        "(während|solange) {condition} (dann|führe aus) {body}"
        "wiederhole (während|solange) {condition} (dann|führe aus) {body}"
        "wiederhole {body}, (während|solange) {condition}"
        "(während|solange) {condition}, (dann|führe) {body} jede {every} Sekunde aus"
        "(während|solange) {condition}, (dann|führe) {body} höchstens {max_minutes} Minuten lang aus"
      ];

      lists = {
        condition.wildcard = true;
        body.wildcard      = true;
        every.values       = de.numberFromOneTo 59;
        max_minutes.values = de.numberFromOneTo 59;
      };
    };

  };}
