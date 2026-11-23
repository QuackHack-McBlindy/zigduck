{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.state = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "{reverse} (ist|befindet sich) {state} in {room}"
        "{reverse} (ist|befindet sich) {state} in {device}"
        "{device} ist {reverse} {state}"
        "prüfe, ob {device} {state} ist"
        "prüfe, ob {device} in {room} {state} ist"
        "überprüfe, ob {device} {state} ist"
        "überprüfe, ob {device} in {room} {state} ist"
        "ist {state} in {room}"
        "prüfe, ob {state} in {room} ist"
        "{state} ist in {room}"
        "{state} ist in {device}"
        "{state} befindet sich in {room}"
        "Bewegung in {room}"
        "Status [von] {device}"
        "Status [in] {room}"
        "zeige den Status [von] {device}"
        "zeige den Status [in] {room}"
        "Status [von] (allen|allem) (Geräten|Lampen)"
        "in welchem Modus ist {device}"
        "welchen Zustand hat {device}"
        "wie viel {state} hat {device}"
        "welchen {state} hat {device}"
        "welche Position hat {device}"
        "{device} ist {state}"
      ];
      lists = {
        state.values  = de.states;
        device.values = de.devices ++ de.tvDevices;
        room.values   = de.rooms;
        reverse.values = [
          { "in" = "nicht"; out = "true"; }
        ];
      };
    };

  };}
