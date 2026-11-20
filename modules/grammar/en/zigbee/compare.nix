{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.compare = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      sentences = [
        "{scope} [battery-powered] (device|devices|sensor|sensors|thing|things|gadget|gadgets) has less {metric} than {below}"
        "{scope} [battery-powered] (device|devices|sensor|sensors|thing|things|gadget|gadgets) has more {metric} than {above}"
        "{scope} [battery-powered] (device|devices|sensor|sensors|thing|things|gadget|gadgets) has {metric} below {below}"
        "{scope} [battery-powered] (device|devices|sensor|sensors|thing|things|gadget|gadgets) has {metric} above {above}"
        "is it the {scope} [battery-powered] (device|devices|sensor|sensors) that has less {metric} than {below}"
        "is it the {scope} [battery-powered] (device|devices|sensor|sensors) that has more {metric} than {above}"
        "{device} (draws|uses|is) (more|above) [than] {above} watts"
        "{device} (draws|uses|is) (less|below) [than] {below} watts"
        "{device} {metric} above {above}"
        "{device} {metric} below {below}"
        "{device} {metric} more than {above}"
        "{device} {metric} less than {below}"
        "{metric} [on] {device} above {above}"
        "{metric} [on] {device} below {below}"
        "{metric} [on] {device} more than {above}"
        "{metric} [on] {device} less than {below}"
        "{device} has {metric} above {above}"
        "{device} has {metric} below {below}"
        "{device} has {metric} more than {above}"
        "{device} has {metric} less than {below}"
        "{device} has more {metric} than {above}"
        "{device} has less {metric} than {below}"
        "is {device} {metric} above {above}"
        "is {device} {metric} below {below}"
        "is {metric} [on] {device} above {above}"
        "is {metric} [on] {device} below {below}"
        "does {device} have {metric} above {above}"
        "does {device} have {metric} below {below}"
        "does {device} have more {metric} than {above}"
        "does {device} have less {metric} than {below}"
      ];
      lists = {
        device.values = en.devices;
        scope.values  = [
          { "in" = "any|some|something|a few"; out = "any";  }
          { "in" = "all|everything";           out = "all";  }
          { "in" = "none|nothing";             out = "none"; }
        ];
        metric.values = en.metrics;
        above.values  = en.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
        below.values  = en.numberFromZeroTo 200
                     ++ map (n: { "in" = toString n; out = toString n; })
                            [ 300 400 500 750 1000 1500 2000 3000 ];
      };
    };

  };}
