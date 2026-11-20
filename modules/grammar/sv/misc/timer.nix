{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let
  zigduck-cli = self.inputs.zigduck.packages.${pkgs.stdenv.hostPlatform.system}.zigduck-cli;

in {
  yo.scripts.timer = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      sentences = [
        "(skapa|ställ|sätt|starta) [en] (time|timer|timern) [på] {hours} (timme|timmar) {minutes} (minut|minuter) {seconds} (sekund|sekunder)"
        "(skapa|ställ|sätt|starta) [en] (time|timer|timern) [på] {minutes} (minut|minuter) [och] {seconds} (sekund|sekunder)"
        "(skapa|ställ|sätt|starta) [en] (time|timer|timern) [på] {minutes} (minut|minuter)"

        "hur {list} är det kvar på (time|timer|timern)"
        "tid {list} på (time|timer|timern)"
        "när {list} (time|timer|timern)"
      ];
      lists = {
        list.values    = [
          { "in" = "länge|kvar"; out = "true"; }
        ];
        seconds.values = sv.clock.seconds;
        minutes.values = sv.clock.minutes;
        hours.values   = sv.clock.hours;
      };
    };

  };}
