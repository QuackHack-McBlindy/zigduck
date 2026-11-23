{
  self,
  lib,
  config,
  pkgs,
  ...
}: let

in {
  yo.scripts.notify = {
    description = "Send a Zigduck notification.";
    category = "Misc";
    parameters = [
      { name = "message"; description = "message"; type = "string"; }
      { name = "tag"; description = "tag"; optional = true; }
    ];
    code = ''
      if [ -n "''${tag:-}" ]; then
        zigduck-cli --notify "$message" --tag "$tag"
      else
        zigduck-cli --notify "$message"
      fi
    '';

  };}
