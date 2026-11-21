{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
}: let

in {
  yo.scripts.state = lib.mkIf (lib.elem "de" config.house.languages) {
    voice = {
      sentences = [
        "ist {reverse} {state} in {room}"
        "gibt es {reverse} {state} in {room}"
        "ist {reverse} {state} in {device}"
        "gibt es {reverse} {state} in {device}"
        "{device} ist {reverse} {state}"
        "prüfe ob {device} {state} ist"
        "prüfe ob {device} in {room} {state} ist"
        "überprüfe ob {device} {state} ist"
        "überprüfe ob {device} in {room} {state} ist"
        "ist {state} in {room}"
        "prüfe ob {state} in {room} ist"
        "{state} in {room}"
        "bewegung in {room}"
        "status [von] {device}"
        "status [in] {room}"
        "zeige status [von] {device}"
        "zeige status [in] {room}"
        "status [von] (allen|alle) (geräten|lampen)"
        "in welchem modus ist {device}"
        "welchen zustand hat {device}"
        "wie viel {state} hat {device}"
        "welche {state} hat {device}"
        "welche position hat {device}"
        "{device} ist {state}"
      ];

      lists = {
        state.values = de.states;
        device.values = de.devices;
        room.values = de.rooms;
        reverse.values = [
          { "in" = "nicht|kein|keine"; out = "true"; }
        ];
      };
    };

  };}
