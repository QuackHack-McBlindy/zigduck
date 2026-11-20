{
  self,
  lib,
  config,
  sv,
  ...
} : let

in {
  yo.scripts.countdown = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "sätt {seconds} sekunders (nedräkning|countdown) på {device}"
        "låt {device} stänga om {seconds} sekunder"
        "sätt {device} att stänga om {seconds} sekunder"
        "stäng {device} om {seconds} sekunder"
        "sätt (nedräkning|countdown) {seconds} på {device}"
        "sätt {device} (nedräkning|countdown) {seconds}"
        "stoppa (nedräkning|countdown) på {device}"
        "avbryt (nedräkning|countdown) på {device}"
      ];
      lists = {
        device.values  = sv.devices;
        seconds.values = sv.numberFromZeroTo 300;
      };
    };

  };}
