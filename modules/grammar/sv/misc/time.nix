{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
}:

{
  yo.scripts.time = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      priority = 1;
      sentences = [
        "(va|vad|vart) är (klocka|klockan)"
        "hur mycket är (klocka|klockan)"
        "(va|vad|vart) är (de|det) för dag [idag]"
        "vilket datum är det [idag]"
        "vad är det för datum [idag]"
      ];
    };

    responses = lib.mkIf (lib.elem "sv" config.house.languages) [
      {
        name = "TIME_TEXT";
        description = "A statement announcing current time";
        text = "Klockan är just nu";
      }
      {
        name = "DATE_TEXT";
        description = "A statement announcing today's weekday and date";
        text = "Idag är det";
      }
      {
        name = "WEEK_TEXT";
        description = "A statement announcing the current week of the year";
        text = "Det är vecka";
      }
    ];

  };}
