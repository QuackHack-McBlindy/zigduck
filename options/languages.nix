{
  lib,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
  Types = import ./types.nix { inherit lib; };
in {
  options.house = {
    languages = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ "en" ];
      example = [ "sv" "en" ];
      description = ''
        #
      '';
    };


  };}
