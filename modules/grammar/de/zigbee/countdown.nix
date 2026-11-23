{
  self,
  lib,
  config,
  de,
  ...
} : let

in {
  yo.scripts.countdown = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "stelle einen (Countdown|Timer) von {seconds} Sekunden für {device}"
        "lass {device} in {seconds} Sekunden ausschalten"
        "stelle {device} so ein, dass es sich in {seconds} Sekunden ausschaltet"
        "schalte {device} in {seconds} Sekunden aus"
        "stelle einen (Countdown|Timer) von {seconds} für {device}"
        "stelle einen (Countdown|Timer) für {device} auf {seconds}"
        "stoppe den (Countdown|Timer) für {device}"
        "brich den (Countdown|Timer) für {device} ab"
      ];
      lists = {
        device.values  = de.devices;
        seconds.values = de.numberFromZeroTo 300;
      };
    };

  };}
