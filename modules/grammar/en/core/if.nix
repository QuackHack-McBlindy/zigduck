{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let


in {
  yo.scripts."if" = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 2;
      fuzzy.enable = true;
      fuzzy.threshold = 0.5;

      sentences = [
        "om {condition} så {then} och {efter} plus {plus}"
        "om {condition} isåfall {then} och {efter} plus {plus}"
        "om {condition} så {then} och {efter}"
        "om {condition} isåfall {then} och {efter}"
        "om {condition} [så] {then}"
        "om {condition} isåfall {then}"
        "om {condition} gör {then}"
        "om {condition} så {then} annars {annars}"
        "kolla om {condition} isåfall {then}"
        "(varna|larma) mig om {condition} så {then} annars {annars}"
        "(varna|larma) mig om {condition} så {then}"
      ];

      lists = {
        condition.wildcard = true;
        "then".wildcard    = true;
        efter.wildcard     = true;
        plus.wildcard      = true;
        annars.wildcard    = true;
      };
    };

  };}
