{
  self,
  config,
  lib,
  pkgs,
  ...
} : with lib;
let
  Types = import ./../options/types.nix { inherit lib; };
  cfg = config.services.zigduck;
  house = config.house;
  zigduckPkgs = self.inputs.zigduck.packages.${pkgs.system};


in {
  config = mkMerge [
    (mkIf cfg.gnomeExtension.enable {
      environment.systemPackages = [
        zigduckPkgs.gnomeExtension
      ];
    })


  ];}
