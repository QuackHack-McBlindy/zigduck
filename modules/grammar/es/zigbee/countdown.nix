{
  self,
  lib,
  config,
  es,
  ...
} : let

in {
  yo.scripts.countdown = lib.mkIf (lib.elem "es" config.house.languages) {
    voice = {
      sentences = [
        "pon una (cuenta atrás|temporizador) de {seconds} segundos en {device}"
        "haz que {device} se apague dentro de {seconds} segundos"
        "configura {device} para que se apague dentro de {seconds} segundos"
        "apaga {device} dentro de {seconds} segundos"
        "pon una (cuenta atrás|temporizador) de {seconds} en {device}"
        "configura una (cuenta atrás|temporizador) de {seconds} en {device}"
        "detén la (cuenta atrás|temporizador) en {device}"
        "cancela la (cuenta atrás|temporizador) en {device}"
      ];
      lists = {
        device.values  = es.devices;
        seconds.values = es.numberFromZeroTo 300;
      };
    };

  };}
