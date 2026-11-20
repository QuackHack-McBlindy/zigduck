{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {

  yo.scripts.timer = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      sentences = [
        "(set|start|create) [a] timer [for] {hours} (hour|hours) {minutes} (minute|minutes) {seconds} (second|seconds)"
        "(set|start|create) [a] timer [for] {minutes} (minute|minutes) [and] {seconds} (second|seconds)"
        "(set|start|create) [a] timer [for] {minutes} (minute|minutes)"
        "(set|start|create) [a] timer [for] {seconds} (second|seconds)"

        "how (much|long) {list} left on [the] timer"
        "time {list} on [the] timer"
        "when {list} [the] timer"
      ];
      lists = {
        list.values = [
          { "in" = "[left|remaining]"; out = "true"; }
        ];
        seconds.values = en.clock.seconds;
        minutes.values = en.clock.minutes;
        hours.values   = en.clock.hours;
      };
    };

  };}
