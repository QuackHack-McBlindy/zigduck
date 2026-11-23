{
  self,
  lib,
  config,
  pkgs,
  es,
  ...
} : let

in {
  yo.scripts.house = lib.mkIf (lib.elem "es" config.house.languages) {
    voice  = {
      sentences       = [
          # 🦆 dice ⮞ varias tareas
          "{device} [pon|enciende|apaga] {state} en {room} [{when}] y [cambia] el color [a] {color} [y] el brillo [a] {brightness} por ciento"
          "{device} [pon|enciende|apaga] {state} en {room} y [cambia] el color [a] {color} [y] el brillo [a] {brightness} por ciento"
          "[pon|enciende|apaga] {state} {device} [en] {color} [color] [y] {brightness} por ciento [de brillo]"
          "[pon|enciende|apaga] {state} {room} [en] {color} [color] [y] {brightness} por ciento [de brillo]"
          "[pon|enciende|apaga] {state} {room} y [el brillo|el nivel de brillo] al {brightness} por ciento"
          "(pon|ajusta|cambia|regula) {device} al {brightness} por ciento"
          "(pon|ajusta|cambia|regula) el brillo [de] {device} al {brightness} por ciento"
          "(haz|pon) {device} (más brillante|más oscuro)"
          "{device} al {brightness} por ciento"
          "{brightness} por ciento [de brillo] en {device}"
          "{brightness} por ciento [de brillo] en {room}"
          #"{scene} todas las luces"
          "{scene} (iluminación|la iluminación)"
          "{scene} (lámpara|lámparas|las lámparas|todo|luz|la luz)"
          "apaga (la lámpara|las lámparas|todo|la luz|las luces) [otra vez] {scene} [como] [el] [maldito] [infierno]"
          #"{state} [de] {all-lights} (luces|las luces)"
          "[pon|enciende|apaga] {state} {device} (luces|otra vez)"
          "[pon|enciende|apaga] {state} [todas|todas las] (luces|lámparas) en {room}"
          "[pon|enciende|apaga] {state} (las lámparas|las luces) [en] {room}"
          "[pon|enciende|apaga] {state} {room}"
          "[pon|enciende|apaga] {state} la iluminación en {room}"
          "[pon|enciende|apaga] {state} [en|apagado] en {room}"
          "[pon|enciende|apaga] {state} [todas|todas las] (luces|lámparas) en {room}"
          "[pon|enciende|apaga] {state} {device}"

          # 🦆 dice ⮞ control del color
          "(cambia|pon) el color [de] {device} a {color}"
          "(cambia|pon) {device} en {color}"
          "(cambia|pon) {room} en {color}"

          # 🦆 dice ⮞ modo de emparejamiento
          #"{pair} [nuevo|nuevos] [zigbee] (dispositivo|dispositivos)"

          # 🦆 dice ⮞ control del brillo
          "ajusta {device} al {brightness} por ciento"

          # 🦆 dice ⮞ consultar temperatura
          "¿cuál es la {get-temp} en {room} [justo] [ahora]"
          "¿qué {get-temp} hay en {room} [ahora]"
          "¿cuántos {get-temp} hay en {room} [justo] [ahora]"
          "¿qué {get-temp} hace en {room} [justo] [ahora]"

          # 🦆 dice ⮞ consultar batería
          #"¿cuánta {get-bat} queda (en|para) {device}"
          #"¿cuánta {get-bat} le queda (a|en) {device}"
          #"¿tiene {device} poca {get-bat} [restante]"
          #"¿queda mucha {get-bat} en {device}"
          #"¿qué nivel de {get-bat} tiene {device} [nivel|porcentaje]"

          # 🦆 dice ⮞ controlar todas las persianas
          "(sube|tira de|gira|mueve) {blinds} (persianas|las persianas)"
          "{scene} [todas las] (luces|las luces|la luz)"
          "(despacio|lentamente|poco a poco|slowly) apaga [en] {scene}"
          "(apaga|cierra) {scene} (despacio|lentamente)"
      ];
      lists = {
        device.values      = es.devices;
        color.values       = es.colors;
        room.values        = es.rooms;
        temperature.values = es.temperature;
        brightness.values  = es.brightness;
        state.values       = [
            { "in" = "enciende|encendido|inicia|activa"; out = "ON"; }
            { "in" = "apaga|apagado|desactiva|cierra";   out = "OFF"; }
        ];
        scene.values = es.scenes ++ [
            { "in" = "enciende|encender|piensa|máximo|maximiza|máximo"; out = "max"; }
            { "in" = "encendido|enciende|activo";                      out = "max"; }
            { "in" = "oscuro|oscuridad|apagado|apagada|desactivado";   out = "dark"; }
            { "in" = "apagado|apaga|cerrado|cierra";                   out = "dark"; }
            { "in" = "rápido";                                         out = "dark-fast"; }
            { "in" = "cocina|la cocina";                               out = "kitchenFadeOff"; }
            { "in" = "ambiente|acogedor|cómodo|relax|relájate";         out = "Chill Scene"; }
        ];
        all-lights.values = [
            { "in" = "todo|todos|todas"; out = "true"; }
        ];
        blinds.values     = [
            { "in" = "arriba|subir";  out = "up"; }
            { "in" = "abajo|bajar";   out = "down"; }
            { "in" = "abrir|abre";    out = "open"; }
            { "in" = "cerrar|cierra"; out = "close"; }
        ];
        #pair.values      = [
        #   { "in" = "[emparejar|empareja]"; out = "true"; }
        #];
      };
    };

  };}
