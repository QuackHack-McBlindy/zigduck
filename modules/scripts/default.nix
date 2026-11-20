# zigduck/modules/scripts/default.nix
# scripts imports
{
  config,
  lib,
  pkgs,
  ...
} : let
  importDir = dir:
    if !builtins.pathExists dir then [ ]
    else if builtins.pathExists (dir + "/default.nix") then [ dir ]
    else
      let
        entries  = builtins.readDir dir;
        nixFiles = builtins.attrNames (
          lib.filterAttrs
            (name: type: type == "regular" && lib.hasSuffix ".nix" name)
            entries
        );
      in map (name: dir + "/${name}") nixFiles;
in
{
  imports =
    importDir ./core
    ++ importDir ./media
    ++ importDir ./misc
    ++ importDir ./zigbee;

  _module.args.maps = import ./lib.nix { inherit config lib pkgs; };
}
