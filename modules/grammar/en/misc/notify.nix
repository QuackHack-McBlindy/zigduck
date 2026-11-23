{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {

  yo.scripts.notify = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      sentences = [
        "(notify|inform) [me] [about] [that] {message}"
        "send [a] notification [about] [that] {message}"
      ];
      lists.message.wildcard = true;
      lists.tag.wildcard = true;
    };

  };}
