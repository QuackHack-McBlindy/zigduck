{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.compare = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
      sentences = [
        "{scope} [batteriebetriebenes] (Gerät|Geräte|Sensor|Sensoren) hat weniger {metric} als {below}"
        "{scope} [batteriebetriebenes] (Gerät|Geräte|Sensor|Sensoren) hat mehr {metric} als {above}"
        "{scope} [batteriebetriebenes] (Gerät|Geräte|Sensor|Sensoren) hat einen {metric}-Wert unter {below}"
        "{scope} [batteriebetriebenes] (Gerät|Geräte|Sensor|Sensoren) hat einen {metric}-Wert über {above}"
        "gibt es {scope} [batteriebetriebene] (Geräte|Sensoren) mit weniger {metric} als {below}"
        "gibt es {scope} [batteriebetriebene] (Geräte|Sensoren) mit mehr {metric} als {above}"
        "{device} (verbraucht|nutzt|liegt bei) (mehr als|über) {above} Watt"
        "{device} (verbraucht|nutzt|liegt bei) (weniger als|unter) {below} Watt"
        "{device} {metric} über {above}"
        "{device} {metric} unter {below}"
        "{device} {metric} mehr als {above}"
        "{device} {metric} weniger als {below}"
        "{metric} [bei] {device} über {above}"
        "{metric} [bei] {device} unter {below}"
        "{metric} [bei] {device} mehr als {above}"
        "{metric} [bei] {device} weniger als {below}"
        "{device} hat {metric} über {above}"
        "{device} hat {metric} unter {below}"
        "{device} hat mehr {metric} als {above}"
        "{device} hat weniger {metric} als {below}"
        "{device} hat mehr {metric} als {above}"
        "{device} hat weniger {metric} als {below}"
        "liegt {device} {metric} über {above}"
        "liegt {device} {metric} unter {below}"
        "liegt {metric} [bei] {device} über {above}"
        "liegt {metric} [bei] {device} unter {below}"
        "hat {device} {metric} über {above}"
        "hat {device} {metric} unter {below}"
        "hat {device} mehr {metric} als {above}"
        "hat {device} weniger {metric} als {below}"
      ];
      lists = {
        device.values = de.devices;
        scope.values  = [
          { "in" = "irgendein|irgendeine|irgendein|irgendein|einige"; out = "any";  }
          { "in" = "alle|alles|alle";              out = "all";  }
          { "in" = "kein|keines|keine";           out = "none"; }
        ];
        metric.values = de.metrics;
        above.values  = de.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
        below.values  = de.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
      };
    };

  };}
