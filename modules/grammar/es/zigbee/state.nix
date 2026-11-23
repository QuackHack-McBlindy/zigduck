







{
  self,
  lib,
  config,
  pkgs,
  es,
  ...
} : let

in {
  yo.scripts.state = lib.mkIf (lib.elem "es" config.house.languages) {
    voice = {
      sentences = [
        "hay {state} en {room}"
        "hay {state} en {device}"
        "{device} {reverse} está {state}"
        "comprueba si {device} está {state}"
        "comprueba si {device} en {room} está {state}"
        "verifica si {device} está {state}"
        "verifica si {device} en {room} está {state}"
        "¿hay {state} en {room}?"
        "comprueba si hay {state} en {room}"
        "hay {state} en {room}"
        "{device} está {state}"
        "hay {state} en {room}"
        "movimiento en {room}"
        "estado [de] {device}"
        "estado [en] {room}"
        "muestra el estado [de] {device}"
        "muestra el estado [en] {room}"
        "estado [de] (todos|todas) (los dispositivos|las luces)"
        "¿en qué modo está {device}?"
        "¿qué estado tiene {device}?"
        "¿cuánto {state} tiene {device}?"
        "¿qué {state} tiene {device}?"
        "¿qué posición tiene {device}?"
        "{device} está {state}"
      ];
      lists = {
        state.values  = es.states;
        device.values = es.devices ++ es.tvDevices;
        room.values   = es.rooms;
        reverse.values = [
          { "in" = "no"; out = "true"; }
        ];
      };
    };

  };}
