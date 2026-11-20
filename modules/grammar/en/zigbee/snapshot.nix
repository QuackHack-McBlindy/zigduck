{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let

in {

  yo.scripts.snapshot = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
      sentences = [
        "{action} [a] (snap|snapshot|system image|image) [of] [the] [system] [and] (name|rename) it [to] [as] {name}"
        "{action} [a] (system|the system|the lights) to [as] {name}"
      ];
      lists = {
        action.values = [
          { "in" = "create|make|build|prepare"; out = "create"; }
          { "in" = "recreate|restore|rebuild|original|return|reconstruct"; out = "restore"; }
        ];
        name.wildcard = true;
      };
    };

  };}
