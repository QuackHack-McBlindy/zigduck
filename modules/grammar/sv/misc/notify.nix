{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {

  yo.scripts.notify = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
      sentences = [
        "(notifiera|meddela) [mig] [om] [att] {message}"
        "skicka [en] notis [om] [att] {message}"
      ];
      lists.message.wildcard = true;
      lists.tag.wildcard = true;
    };

  };}
