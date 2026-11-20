{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.house = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice  = {
      priority        = 2;
      fuzzy.enable    = true;
      fuzzy.threshold = 0.5;
      sentences       = [
          # 🦆 says ⮞ multi taskerz
          "{device} [sätt|slå|stäng] {state} i {room} [{when}] och [ändra] färg[en] [till] {color} [och] ljusstyrka[n] [till] {brightness} procent"
          "{device} [sätt|slå|stäng] {state} i {room} och [ändra] färg[en] [till] {color} [och] ljusstyrka[n] [till] {brightness} procent"
          "[sätt|slå|stäng] {state} {device} [till] {color} [färg] [och] {brightness} procent [ljusstyrka]"
          "[sätt|slå|stäng] {state} {room} [till] {color} [färg] [och] {brightness} procent [ljusstyrka]"
          "[sätt|slå|stäng] {state} {room} och [ljusstyrka|ljusstyrkan] {brightness} procent"
          "(sätt|ställ|ändra|justera) {device} till {brightness} procent"
          "(sätt|ställ|ändra|justera) ljusstyrkan [på] {device} till {brightness} procent"
          "(gör|ställ) {device} (ljusare|mörkare)"
          "{device} till {brightness} procent"
          "{brightness} procent [ljusstyrka] på {device}"
          "{brightness} procent [ljusstyrka] i {room}"
          #"{scene} alla lampor"
          "{scene} (belysning|belysningen)"
          "{scene} (lamp|lampor|lamporna|allt|ljus|ljuset)"
          "släck (lamp|lampor|lamporna|allt|ljus|ljuset) [igen] {scene} [som] [fan] [utav] [helvete]"
          #"{state} [av] {all-lights} (lampor|lamporna)"
          "[sätt|slå|stäng] {state} {device} (lampor|igen)"
          "[sätt|slå|stäng] {state} [alla|allt] (lampor|lamporna|ljus) i {room}"
          "[sätt|slå|stäng] {state} (lamporna|ljusen) [i] {room}"
          "[sätt|slå|stäng] {state} {room}"
          "[sätt|slå|stäng] {state} belysningen i {room}"
          "[sätt|slå|stäng] {state} [på|av] i {room}"
          "[sätt|slå|stäng] {state} [alla|allt] (lampor|lamporna|ljus) i {room}"
          "[sätt|slå|stäng] {state} {device}"

          # 🦆 says ⮞ color control
          "(ändra|gör) färgen [på|i] {device} till {color}"
          "(ändra|gör) {device} {color}"
          "(ändra|gör) {room} {color}"

          # 🦆 says ⮞ pairing mode
          #"{pair} [ny|nya] [zigbee] (enhet|enheter)"

          # 🦆 says ⮞ brightness control
          "justera {device} till {brightness} procent"

          # 🦆 says ⮞ fetch temp
          "vad är {get-temp} i {room} [just] [nu]"
          "vad är det för {get-temp} i {room} [nu]"
          "hur många {get-temp} är det i {room} [just] [nu]"
          "hur {get-temp} är det i {room} [just] [nu]"

          # 🦆 says ⮞ fetch battery
          #"hur mycket {get-bat} återstår (på|i) {device}"
          #"hur mycket {get-bat} är det kvar (på|i) {device}"
          #"har {device} lite {get-bat} [kvar]"
          #"är det mycket {get-bat} kvar på {device}"
          #"vad har {device} för {get-bat} [nivå|procent]"

          # 🦆 says ⮞ contorl all blinds
          "(hissa|dra|veva|ta) {blinds} (persienner|persiennerna)"
          "{scene} [alla] (lampor|lamporna|ljuset|ljusen)"
          "(långsam|långsamt|sakta|slowly) släck [i] {scene}"
          "(släck|stäng) {scene} (långsam|långsamt|sakta)"
      ];
      lists = {
        device.values      = sv.devices;
        color.values       = sv.colors;
        room.values        = sv.rooms;
        temperature.values = sv.temperature;
        brightness.values  = sv.brightness;
        state.values       = [
            { "in" = "tänd|på|starta|aktivera";    out = "ON"; }
            { "in" = "släck|av|avaktivera|stäng|av"; out = "OFF"; }
        ];
        scene.values = sv.scenes ++ [
            { "in" = "tänd||tänk|max|maxa|maxxa|maxad|maximum"; out = "max"; }
            { "in" = "på|tänd|aktiv";                           out = "max"; }
            { "in" = "mörk|mörker|mörkt|släckt|avstängd";       out = "dark"; }
            { "in" = "av|släck|släckt|stängd|stäng";            out = "dark"; }
            { "in" = "fort";                                    out = "dark-fast"; }
            { "in" = "kök|köket";                               out = "kitchenFadeOff"; }
            { "in" = "mys|myspys|mysig|chill|chilla";           out = "Chill Scene"; }
        ];
        all-lights.values = [
            { "in" = "all|alla|allt"; out = "true"; }
        ];
        blinds.values     = [
            { "in" = "up|upp";   out = "up"; }
            { "in" = "ner|ned";  out = "down"; }
            { "in" = "öppna";    out = "open"; }
            { "in" = "stäng";    out = "close"; }
        ];
        #pair.values      = [
        #   { "in" = "[para|paras]"; out = "true"; }
        #];
      };
    };

  };}
