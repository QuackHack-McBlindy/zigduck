{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {

  yo.scripts.snapshot = {
    description = "Create or restore a named snapshot of the Zigduck light/device states.";
    category = "Zigbee";
    parameters = [
      { name = "action"; description = "Create or restore snapshot"; optional = false;
        values = [ "create" "restore" ]; }
      { name = "name"; type = "string"; description = "Name of the snapshot."; optional = false; }
    ];
    code = ''
      zigduck-cli snapshot "$action" "$name"
    '';


  };}
