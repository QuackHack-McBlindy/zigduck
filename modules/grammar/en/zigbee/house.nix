{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.house = {
    voice  = lib.mkIf (lib.elem "en" config.house.languages) {
      priority        = 2;
      fuzzy.enable    = true;
      fuzzy.threshold = 0.5;
      sentences       = [
          # 🦆 says ⮞ multi taskerz
          "{device} [set|put|turn] {state} in {room} [{when}] and [change] [the] color [to] {color} [and] brightness [to] {brightness} percent"
          "{device} [set|put|turn] {state} in {room} and [change] [the] color [to] {color} [and] brightness [to] {brightness} percent"
          "[set|put|turn] {state} {device} [to] {color} [color] [and] {brightness} percent [brightness]"
          "[set|put|turn] {state} {room} [to] {color} [color] [and] {brightness} percent [brightness]"
          "[set|put|turn] {state} {room} and [brightness] {brightness} percent"
          "(set|change|adjust) {device} to {brightness} percent"
          "(set|change|adjust) [the] brightness [on] {device} to {brightness} percent"
          "(make|set) {device} (brighter|darker)"
          "{device} to {brightness} percent"
          "{brightness} percent [brightness] on {device}"
          "{brightness} percent [brightness] in {room}"
          #"{scene} all lamps"
          "{scene} (lighting|the lighting)"
          "{scene} (lamp|lamps|the lamps|all|light|the light)"
          "turn off (lamp|lamps|the lamps|all|light|the light) [again] {scene} [like] [fucking] [hell] [itself]"
          #"{state} [off] {all-lights} (lamps|the lamps)"
          "[set|put|turn] {state} {device} (lamps|again)"
          "[set|put|turn] {state} [all] (lamps|the lamps|light) in {room}"
          "[set|put|turn] {state} (the lamps|the lights) [in] {room}"
          "[set|put|turn] {state} {room}"
          "[set|put|turn] {state} the lighting in {room}"
          "[set|put|turn] {state} [on|off] in {room}"
          "[set|put|turn] {state} [all] (lamps|the lamps|light) in {room}"
          "[set|put|turn] {state} {device}"

          # 🦆 says ⮞ color control
          "(change|make) the color [on|in] {device} to {color}"
          "(change|make) {device} {color}"
          "(change|make) {room} {color}"

          # 🦆 says ⮞ pairing mode
          #"{pair} [new] [zigbee] (device|devices)"

          # 🦆 says ⮞ brightness control
          "adjust {device} to {brightness} percent"

          # 🦆 says ⮞ fetch temp
          "what is {get-temp} in {room} [right] [now]"
          "what is the {get-temp} in {room} [now]"
          "how many {get-temp} is it in {room} [right] [now]"
          "how {get-temp} is it in {room} [right] [now]"

          # 🦆 says ⮞ fetch battery
          #"how much {get-bat} is left (on|in) {device}"
          #"how much {get-bat} is left (on|in) {device}"
          #"does {device} have low {get-bat} [left]"
          #"is there much {get-bat} left on {device}"
          #"what {get-bat} [level|percent] does {device} have"

          # 🦆 says ⮞ control all blinds
          "(raise|pull|crank|take) {blinds} (blinds|the blinds)"
          "{scene} [all] (lamps|the lamps|the light|the lights)"
          "(slow|slowly|gently) turn off [in] {scene}"
          "(turn off|close) {scene} (slow|slowly|gently)"
      ];
      lists = {
        device.values      = en.devices;
        color.values       = en.colors;
        room.values        = en.rooms;
        temperature.values = en.temperature;
        brightness.values  = en.brightness;
        state.values       = en.states;
        scene.values = en.scenes;
        all-lights.values = [
            { "in" = "all|every|everything"; out = "true"; }
        ];
        blinds.values     = [
            { "in" = "up";        out = "up"; }
            { "in" = "down";      out = "down"; }
            { "in" = "open";      out = "open"; }
            { "in" = "close";     out = "close"; }
        ];
        #pair.values      = [
        #   { "in" = "[pair|pairs]"; out = "true"; }
        #];
      };
    };

  };}
