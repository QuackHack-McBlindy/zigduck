{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption types;
in {

  options.house.zigbee.scenes = mkOption {
    type = lib.types.attrsOf (lib.types.submodule {
      freeformType = lib.types.attrsOf lib.types.attrs;

      options._aliases = lib.mkOption {
        type        = lib.types.listOf lib.types.str;
        default     = [];
        description = "Alternative names / aliases for this scene";
        example     = [ "chill" "myscene" ];
      };
    });
    default     = {};
    description = "Scenes for Zigbee devices";
    example = {
      "Chill Scene" = {
        _aliases    = [ "chill" "myscene" ];
        "Spotlight" = { state = "ON"; brightness = 200; color = { hex = "#8A2BE2"; }; };
        "Lamp"      = { state = "ON"; brightness = 200; color = { hex = "#40E0D0"; }; };
      };

      "dark" = {
        "Bloom" = { state = "OFF"; transition = 13; };
        # ...
      };
    };

  };}
