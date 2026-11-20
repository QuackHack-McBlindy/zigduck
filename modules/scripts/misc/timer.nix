{
  self,
  lib,
  config,
  pkgs,
  allowFrom,
  sv,
  ...
} : let
#  zigduck-cli = self.inputs.zigduck.packages.${pkgs.stdenv.hostPlatform.system}.zigduck-cli;
in {
  yo.scripts.timer = {
    description = "Set a timer";
    category = "Misc";
    parameters = [
      { name = "minutes"; type = "string"; description = "Minutes to set the timer on"; default = "0";
        values = allowFrom "timer" "minutes"; }
      { name = "seconds"; type = "string"; description = "Seconds to set the timer on"; default = "0";
        values = allowFrom "timer" "seconds"; }
      { name = "hours"; type = "string"; description = "Hours to set the timer on"; default = "0";
        values = allowFrom "timer" "hours"; }
      { name = "list"; type = "bool"; description = "Lists active timers"; default = false;  }
      { name = "sound"; type = "path"; description = "Soundfile to be played on finished timer"; default = /home/pungkula/dotfiles/modules/themes/sounds/finished.wav; }
    ];
    code = ''
      if [ "$list" = "true" ] || [ "$list" = "1" ]; then
            zigduck-cli timer list
        exit 0
      fi

      if [ -z "$hours" ]; then hours=0; fi
      if [ -z "$minutes" ]; then minutes=0; fi
      if [ -z "$seconds" ]; then seconds=0; fi

      if [ "$hours" -eq 0 ] && [ "$minutes" -eq 0 ] && [ "$seconds" -eq 0 ]; then
        zigduck-cli timer list
        exit 0
      fi

      zigduck-cli timer set --hours "$hours" --minutes "$minutes" --seconds "$seconds"
    '';


  };}
