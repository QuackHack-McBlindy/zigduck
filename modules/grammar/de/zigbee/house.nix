{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.house = lib.mkIf (lib.elem "de" config.house.languages) {
    voice  = {
      sentences       = [
          # 🦆 says ⮞ multi taskerz
          "{device} [stelle|schalte] {state} in {room} [{when}] und [ändere] die Farbe [auf] {color} [und] die Helligkeit [auf] {brightness} Prozent"
          "{device} [stelle|schalte] {state} in {room} und [ändere] die Farbe [auf] {color} [und] die Helligkeit [auf] {brightness} Prozent"
          "[stelle|schalte] {state} {device} [auf] {color} [Farbe] [und] {brightness} Prozent [Helligkeit]"
          "[stelle|schalte] {state} {room} [auf] {color} [Farbe] [und] {brightness} Prozent [Helligkeit]"
          "[stelle|schalte] {state} {room} und [Helligkeit] auf {brightness} Prozent"
          "(stelle|setze|ändere|passe) {device} auf {brightness} Prozent"
          "(stelle|setze|ändere|passe) die Helligkeit [von] {device} auf {brightness} Prozent"
          "(mache|stelle) {device} (heller|dunkler)"
          "{device} auf {brightness} Prozent"
          "{brightness} Prozent [Helligkeit] bei {device}"
          "{brightness} Prozent [Helligkeit] in {room}"
          #"{scene} alla lampor"
          "{scene} (Beleuchtung|die Beleuchtung)"
          "{scene} (Lampe|Lampen|die Lampen|alles|Licht|das Licht)"
          "schalte (Lampe|Lampen|die Lampen|alles|Licht|das Licht) [wieder] {scene} [verdammt] aus"
          #"{state} [av] {all-lights} (lampor|lamporna)"
          "[stelle|schalte] {state} {device} (Lampen|wieder)"
          "[stelle|schalte] {state} [alle|alles] (Lampen|die Lampen|Licht) in {room}"
          "[stelle|schalte] {state} (die Lampen|das Licht) [in] {room}"
          "[stelle|schalte] {state} {room}"
          "[stelle|schalte] {state} die Beleuchtung in {room}"
          "[stelle|schalte] {state} [ein|aus] in {room}"
          "[stelle|schalte] {state} [alle|alles] (Lampen|die Lampen|Licht) in {room}"
          "[stelle|schalte] {state} {device}"

          # 🦆 says ⮞ color control
          "(ändere|mache) die Farbe [von] {device} zu {color}"
          "(ändere|mache) {device} {color}"
          "(ändere|mache) {room} {color}"

          # 🦆 says ⮞ pairing mode
          #"{pair} [ny|nya] [zigbee] (enhet|enheter)"

          # 🦆 says ⮞ brightness control
          "stelle {device} auf {brightness} Prozent"

          # 🦆 says ⮞ fetch temp
          "wie hoch ist die {get-temp} in {room} [gerade] [jetzt]"
          "wie hoch ist die {get-temp} in {room} [jetzt]"
          "wie viel {get-temp} gibt es in {room} [gerade] [jetzt]"
          "wie {get-temp} ist es in {room} [gerade] [jetzt]"

          # 🦆 says ⮞ fetch battery
          #"hur mycket {get-bat} återstår (på|i) {device}"
          #"hur mycket {get-bat} är det kvar (på|i) {device}"
          #"har {device} lite {get-bat} [kvar]"
          #"är det mycket {get-bat} kvar på {device}"
          #"vad har {device} för {get-bat} [nivå|procent]"

          # 🦆 says ⮞ contorl all blinds
          "(hebe|ziehe|kurble|fahre) {blinds} (Jalousien|die Jalousien)"
          "{scene} [alle] (Lampen|die Lampen|das Licht|die Lichter)"
          "(langsam|gemächlich) schalte [in] {scene} aus"
          "(schalte aus|schließe) {scene} (langsam|gemächlich)"
      ];
      lists = {
        device.values      = de.devices;
        color.values       = de.colors;
        room.values        = de.rooms;
        temperature.values = de.temperature;
        brightness.values  = de.brightness;
        state.values       = [
            { "in" = "einschalten|an|starten|aktivieren";    out = "ON"; }
            { "in" = "ausschalten|aus|deaktivieren|schließen|aus"; out = "OFF"; }
        ];
        scene.values = de.scenes ++ [
            { "in" = "einschalten||denk|max|maximieren|maximal|Maximum"; out = "max"; }
            { "in" = "an|einschalten|aktiv";                           out = "max"; }
            { "in" = "dunkel|Dunkelheit|dunkel|ausgeschaltet|abgeschaltet";       out = "dark"; }
            { "in" = "aus|ausschalten|ausgeschaltet|geschlossen|schließen";            out = "dark"; }
            { "in" = "schnell";                                    out = "dark-fast"; }
            { "in" = "Küche|die Küche";                               out = "kitchenFadeOff"; }
            { "in" = "gemütlich|Gemütlichkeit|gemütlich|entspannen|entspann dich";           out = "Chill Scene"; }
        ];
        all-lights.values = [
            { "in" = "alle|alle|alles"; out = "true"; }
        ];
        blinds.values     = [
            { "in" = "up|upp";   out = "up"; }
            { "in" = "runter|abwärts";  out = "down"; }
            { "in" = "öffnen";    out = "open"; }
            { "in" = "schließen";    out = "close"; }
        ];
        #pair.values      = [
        #   { "in" = "[para|paras]"; out = "true"; }
        #];
      };
    };

  };}
