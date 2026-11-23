{
  self,
  lib,
  config,
  pkgs,
  es,
  ...
} : let

in {
  yo.scripts.compare = lib.mkIf (lib.elem "es" config.house.languages) {
    voice = {
      sentences = [
        "{scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores|cosa|cosas|aparato|aparatos) tiene menos {metric} que {below}"
        "{scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores|cosa|cosas|aparato|aparatos) tiene más {metric} que {above}"
        "{scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores|cosa|cosas|aparato|aparatos) tiene {metric} por debajo de {below}"
        "{scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores|cosa|cosas|aparato|aparatos) tiene {metric} por encima de {above}"
        "¿es el {scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores) el que tiene menos {metric} que {below}"
        "¿es el {scope} [alimentado por batería] (dispositivo|dispositivos|sensor|sensores) el que tiene más {metric} que {above}"
        "{device} (consume|utiliza|está en) (más de|por encima de) [de] {above} vatios"
        "{device} (consume|utiliza|está en) (menos de|por debajo de) [de] {below} vatios"
        "{device} {metric} por encima de {above}"
        "{device} {metric} por debajo de {below}"
        "{device} {metric} más de {above}"
        "{device} {metric} menos de {below}"
        "{metric} [de] {device} por encima de {above}"
        "{metric} [de] {device} por debajo de {below}"
        "{metric} [de] {device} más de {above}"
        "{metric} [de] {device} menos de {below}"
        "{device} tiene {metric} por encima de {above}"
        "{device} tiene {metric} por debajo de {below}"
        "{device} tiene {metric} más de {above}"
        "{device} tiene {metric} menos de {below}"
        "{device} tiene más {metric} que {above}"
        "{device} tiene menos {metric} que {below}"
        "¿está {device} {metric} por encima de {above}"
        "¿está {device} {metric} por debajo de {below}"
        "¿está {metric} [de] {device} por encima de {above}"
        "¿está {metric} [de] {device} por debajo de {below}"
        "¿tiene {device} {metric} por encima de {above}"
        "¿tiene {device} {metric} por debajo de {below}"
        "¿tiene {device} más {metric} que {above}"
        "¿tiene {device} menos {metric} que {below}"
      ];
      lists = {
        device.values = es.devices;
        scope.values  = [
          { "in" = "alguno|alguna|algún|algo|algunos|algunas"; out = "any";  }
          { "in" = "todos|todas|todo";                         out = "all";  }
          { "in" = "ninguno|ninguna|ningún|nada";              out = "none"; }
        ];
        metric.values = es.metrics;
        above.values  = es.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
        below.values  = es.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
      };
    };

  };}
