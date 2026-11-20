{
  self,
  lib,
  config,
  pkgs,
  ...
} : let

in {

  yo.scripts.scene = {
    description = "Activate a scene by name.";
    category = "Zigbee";
    parameters = [{ name = "name"; description = "Scene name"; type = "string"; }];
    code = ''zigduck-cli --scene "$name"'';

  };}
