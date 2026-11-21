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
  yo.scripts.alarm = {
    voice =  lib.mkIf (lib.elem "sv" config.house.languages) {
      sentences = [
        "(ställ|sätt|start|starta|skap|skapa|gör|fixa) [en|ett] (väckarklocka|väckarklockan|larm|alarm) [på] [klocka|klockan] {hours} [och] {minutes}"
        "(ställ|sätt|start|starta|skap|skapa|gör|fixa) [en|ett] (väckarklocka|väckarklockan|larm|alarm) [på] [klocka|klockan] {minuteWord} {prep} {hours}"
        "(ställ|sätt|start|starta|skap|skapa|gör) [en|ett] (väckarklocka|väckarklockan|larm|alarm) [på] [klocka|klockan] {prep} {hours}"
        "jag vill stiga upp [klock|klocka|klockan] {hours} [och] {minutes}"
        "väck mig [klocka|klockan] {hours} [och] {minutes}"

        "väck mig {minuteWord} {prep} {hours}"
        "jag vill stiga upp {minuteWord} {prep} {hours}"

        "väck mig {prep} {hours}"
        "jag vill stiga upp {prep} {hours}"

        # 🦆 says ⮞ cancel alarm
        "jag vill {cancel} stiga upp [klock|klocka|klockan] {hours} [och] {minutes}"
        "väck {cancel} mig [klocka|klockan] {hours} [och] {minutes}"
        "väck {cancel} mig {minuteWord} {prep} {hours}"
        "väck mmig {cancel} [klocka|klockan] {hours} [och] {minutes}"
        "väck mig {cancel} {minuteWord} {prep} {hours}"
        "jag vill {cancel} stiga upp {minuteWord} {prep} {hours}"
        "väck {cancel} mig {prep} {hours}"
        "väck mig {cancel} {prep} {hours}"
        "jag vill {cancel} stiga upp {prep} {hours}"
        "{cancel} alarmet på [klock|klocka|klockan] {hours} [och] {minutes}"

        "när ska jag {list} [upp]"
        "när {list} min väckarklocka"
      ];
      lists = {
        list.values        = [{ "in" = "stiga|vakna|ringer|kliva"; out = "true"; }];
        cancel.values      = [{ "in" = "inte|avbryt"; out = "true"; }];
        prep.values        = sv.clock.preps;
        minuteWord.values  = sv.clock.minuteWords;
        hours.values       = sv.clock.hours;
        minutes.values     = sv.numberFromZeroTo 59;
      };

    };

  };}
