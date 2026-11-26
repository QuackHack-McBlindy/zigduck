{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
}:

{
  yo.scripts.time = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 1;
      sentences = [
        "(what|where) is the (time|clock)"
        "what time is it"
        "(what|which) day is it [today]"
        "what is today's date"
        "what date is it [today]"
      ];
    };

    responses = lib.mkIf (lib.elem "en" config.house.languages) [
      {
        name = "TIME_TEXT";
        description = "A statement announcing current time";
        text = "It is currently";
      }
      {
        name = "DATE_TEXT";
        description = "A statement announcing today's weekday and date";
        text = "Today is";
      }
      {
        name = "WEEK_TEXT";
        description = "A statement announcing the current week of the year";
        text = "And the week is";
      }
    ];

  };}
