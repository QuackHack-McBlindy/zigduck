# zigduck/modules/default.nix
{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) types mkOption mkEnableOption mkMerge;

in {
    imports = [
      ./../options
      ./scripts
      ./grammar
      ./zigduck.nix
      ./assertions.nix
      ./helpers.nix

    ];

   }
