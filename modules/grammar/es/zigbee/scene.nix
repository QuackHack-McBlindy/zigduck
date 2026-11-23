{
  self,
  lib,
  config,
  pkgs,
  es,
  ...
} : let

in {

  yo.scripts.scene = {
    voice = lib.mkIf (lib.elem "es" config.house.languages) {
      sentences = [
        "(activa|pon|ejecuta|enciende) la escena {name}"
        "(activa|pon|ejecuta|enciende) la escena {name}"
        "(activa|pon|ejecuta|enciende) la escena del techo animado {name}"
        "(activa|pon|ejecuta|enciende) la escena del techo animado {name}"
        "(activa|pon|ejecuta|enciende) la escena green {name}"
        "(activa|pon|ejecuta|enciende) la escena green {name}"
        "(activa|pon|ejecuta|enciende) la escena de la cocina {name}"
        "(activa|pon|ejecuta|enciende) la escena {name} de la cocina"
      ];
      lists.name.values = es.scenes;
    };

  };}
