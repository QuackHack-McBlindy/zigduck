{
  self,
  lib,
  config,
  en,
  ...
} : let

in {
  yo.scripts.countdown = lib.mkIf (lib.elem "en" config.house.languages) {
    voice = {
      sentences = [
        "set a {seconds}-second (timer|countdown) on {device}"
        "have {device} shut down in {seconds} seconds"
        "set {device} to shut down in {seconds} seconds"
        "turn off {device} in {seconds} seconds"
        "set (timer|countdown) {seconds} on {device}"
        "set {device} (timer|countdown) {seconds}"
        "stop (timer|countdown) on {device}"
        "cancel (timer|countdown) on {device}"
      ];
      lists = {
        device.values  = en.devices;
        seconds.values = en.numberFromZeroTo 300;
      };
    };

  };}
