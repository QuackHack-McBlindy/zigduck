{
  self,
  lib,
  config,
  pkgs,
  ...
} : let


in {
  yo.scripts."if" = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "wenn {condition}, dann {then} und danach zusätzlich {plus}"
        "wenn {condition}, in diesem Fall {then} und danach zusätzlich {plus}"
        "wenn {condition}, dann {then} und danach {efter}"
        "wenn {condition}, in diesem Fall {then} und danach {efter}"
        "wenn {condition} [dann] {then}"
        "wenn {condition}, in diesem Fall {then}"
        "wenn {condition}, führe {then} aus"
        "wenn {condition}, dann {then}, ansonsten {annars}"
        "prüfe, ob {condition}; falls ja, {then}"
        "(warne|alarmiere) mich, wenn {condition}; dann {then}, ansonsten {annars}"
        "(warne|alarmiere) mich, wenn {condition}, dann {then}"
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
