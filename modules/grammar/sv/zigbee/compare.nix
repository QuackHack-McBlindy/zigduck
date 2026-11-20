{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.compare = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      priority        = 3;
      fuzzy.enable    = true;
      fuzzy.threshold = 0.5;
      sentences = [
        "{scope} [batteridriven] (enhet|enheter|sensor|sensorer|grej|grejer|pryl|prylar) har mindre {metric} än {below}"
        "{scope} [batteridriven] (enhet|enheter|sensor|sensorer|grej|grejer|pryl|prylar) har mer {metric} än {above}"
        "{scope} [batteridriven] (enhet|enheter|sensor|sensorer|grej|grejer|pryl|prylar) har {metric} under {below}"
        "{scope} [batteridriven] (enhet|enheter|sensor|sensorer|grej|grejer|pryl|prylar) har {metric} över {above}"
        "är det {scope} [batteridriven] (enhet|enheter|sensor|sensorer) som har mindre {metric} än {below}"
        "är det {scope} [batteridriven] (enhet|enheter|sensor|sensorer) som har mer {metric} än {above}"
        "{device} (drar|använder|är) (mer|över) [än] {above} watt"
        "{device} (drar|använder|är) (mindre|under) [än] {below} watt"
        "{device} {metric} över {above}"
        "{device} {metric} under {below}"
        "{device} {metric} mer än {above}"
        "{device} {metric} mindre än {below}"
        "{metric} [på] {device} över {above}"
        "{metric} [på] {device} under {below}"
        "{metric} [på] {device} mer än {above}"
        "{metric} [på] {device} mindre än {below}"
        "{device} har {metric} över {above}"
        "{device} har {metric} under {below}"
        "{device} har {metric} mer än {above}"
        "{device} har {metric} mindre än {below}"
        "{device} har mer {metric} än {above}"
        "{device} har mindre {metric} än {below}"
        "är {device} {metric} över {above}"
        "är {device} {metric} under {below}"
        "är {metric} [på] {device} över {above}"
        "är {metric} [på] {device} under {below}"
        "har {device} {metric} över {above}"
        "har {device} {metric} under {below}"
        "har {device} mer {metric} än {above}"
        "har {device} mindre {metric} än {below}"
      ];
      lists = {
        device.values = sv.devices;
        scope.values  = [
          { "in" = "någon|nån|något|nått|några"; out = "any";  }
          { "in" = "alla|allt|all";              out = "all";  }
          { "in" = "ingen|inget|inga";           out = "none"; }
        ];
        metric.values = sv.metrics;
        above.values  = sv.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
        below.values  = sv.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
      };
    };

  };}
