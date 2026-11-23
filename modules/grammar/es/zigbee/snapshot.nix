{
  self,
  lib,
  config,
  pkgs,
  es,
  ...
} : let

in {

  yo.scripts.snapshot = {
    voice = lib.mkIf (lib.elem "es" config.house.languages) {
      sentences = [
        "{action} [una] (instantánea|captura|snapshot|imagen|imagen del sistema) [del] [sistema|sistema] [y] (ponle nombre|nómbrala) [como] [antes de] {name}"
        "{action} [el] (sistema|las luces) [con el nombre] [antes de] {name}"
      ];
      lists = {
        action.values = [
          { "in" = "crea|crear|haz|prepara"; out = "create"; }
          { "in" = "recrea|restaura|reconstruye|original|devuelve|recupera"; out = "restore"; }
        ];
        name.wildcard = true;
      };
    };

  };}
