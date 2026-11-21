{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.state = lib.mkIf (lib.elem "sv" config.house.languages) {
    voice = {
      sentences = [
        "det {reverse} (är|finns) {state} i {room}"
        "det {reverse} (är|finns) {state} i {device}"
        "{device} {reverse} är {state}"
        "kolla om {device} är {state}"
        "kolla om {device} i {room} är {state}"
        "kontrollera om {device} är {state}"
        "kontrollera om {device} i {room} är {state}"
        "är det {state} i {room}"
        "kolla om det är {state} i {room}"
        "det är {state} i {room}"
        "det är {state} i {device}"
        "det finns {state} i {room}"
        "rörelse i {room}"
        "status [på] {device}"
        "status [i] {room}"
        "visa status [för] {device}"
        "visa status [i] {room}"
        "status [för] (alla|allt|all) (enheter|lampor)"
        "vilket läge är {device} i"
        "vilket tillstånd har {device}"
        "hur mycket {state} har {device}"
        "vilken {state} har {device}"
        "vilken position har {device}"
        "{device} är {state}"
      ];
      lists = {
        state.values  = sv.states;
        device.values = sv.devices ++ sv.tvDevices;
        room.values   = sv.rooms;
        reverse.values = [
          { "in" = "inte"; out = "true"; }
        ];
      };
    };

  };}
