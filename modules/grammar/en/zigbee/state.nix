{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {
  yo.scripts.state = lib.mkIf (lib.elem "en" config.house.languages) {
    voice = {
      sentences = [
        "it {reverse} (is|exists) {state} in {room}"
        "it {reverse} (is|exists) {state} in {device}"
        "{device} {reverse} is {state}"
        "check if {device} is {state}"
        "check if {device} in {room} is {state}"
        "check whether {device} is {state}"
        "check whether {device} in {room} is {state}"
        "is it {state} in {room}"
        "check if it is {state} in {room}"
        "it is {state} in {room}"
        "it is {state} in {device}"
        "there is {state} in {room}"
        "motion in {room}"
        "status [of] {device}"
        "status [in] {room}"
        "show status [for] {device}"
        "show status [in] {room}"
        "status [for] (all) (devices|lights)"
        "what mode is {device} in"
        "what state is {device} in"
        "how much {state} does {device} have"
        "what {state} does {device} have"
        "what position is {device} in"
        #"[is] {device} [is] {state}"
      ];
      lists = {
        state.values  = en.states;
        device.values = en.devices;
        room.values   = en.rooms;
        reverse.values = [
          { "in" = "not"; out = "true"; }
        ];
      };
    };

  };}
