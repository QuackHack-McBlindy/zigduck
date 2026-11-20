{
  config,
  lib,
  pkgs,
  ...
} : let

in {
  yo.scripts.wait = {
    description = "Wait for x seconds before continue.";
    category = "Core";
    parameters = [
      { name = "seconds"; description = "Seconds to wait"; optional = false; }
    ];
    code = ''
      sleep $seconds
    '';

  };}
