{
  pkgs,
  system,
  self,
  inputs
}: let
  languages = [ "sv" "en" "es" "fr" "de" ];

  mkConfig = language:
    inputs.nixpkgs.lib.nixosSystem {
      inherit system;
      specialArgs = { inherit self inputs pkgs; };
      modules = [
        self.nixosModules.zigduck
        ({ lib, ... }: {
          system.stateVersion = "24.11";
          house.languages = [ language ];

          house.zigbee.networkKeyFile = "/dev/null";
          house.zigbee.coordinator = {
            vendorId = "test";
            productId = "test";
          };
          house.zigbee.mosquitto.host = "localhost";

          house.rooms.test = { icon = "mdi:test"; };
          house.rooms.kitchen = { icon = "mdi:test"; };
          house.rooms.hallway = { icon = "mdi:test"; };

          house.zigbee.devices."test" = {
            friendly_name = "Test Device";
            room = "test";
            type = "light";
            endpoint = 1;
          };

          house.zigbee.devices."test1" = {
            friendly_name = "Test Device2";
            aliases = [ "dörr" "ytterdörren" ];
            room = "hallway";
            type = "sensor";
            endpoint = 1;
          };

          house.zigbee.devices."fläkt" = {
            friendly_name = "Fläkt";
            aliases = [ "fläkten" ];
            room = "kitchen";
            type = "outlet";
            endpoint = 1;
          };

          house.zigbee.devices."test3" = {
            friendly_name = "Test Device3";
            aliases = [ "3" ];
            room = "hallway";
            type = "light";
            endpoint = 1;
            supports_color = true;
          };

          house.zigbee.devices."test4" = {
            friendly_name = "Test Device4";
            aliases = [ "4" ];
            room = "kitchen";
            type = "light";
            endpoint = 1;
            supports_color = true;
          };

          house.zigbee.scenes = {
            dark = {
              _aliases = "mörkt";
              "Test Device4" = { state = "OFF"; };
            };
          };

          yo.fuzzy = {
            threshold = 0.6;
            conflict.detection = true;
            conflict.threshold = 70;
          };

          fileSystems = lib.mkForce {
            "/" = { device = "/dev/null"; fsType = "ext4"; };
          };
          boot.loader.grub.enable = lib.mkForce false;
        })
      ];
    };

  failures = builtins.concatLists (
    map (language:
      let cfg = mkConfig language;
      in map (a: { inherit language; assertion = a; })
             (builtins.filter (a: !a.assertion) cfg.config.assertions)
    ) languages
  );

  failedLangs = builtins.attrNames (
    builtins.listToAttrs (map (f: { name = f.language; value = true; }) failures)
  );

  n      = builtins.length failures;
  nLangs = builtins.length failedLangs;

  renderMessage = f:
    let r = builtins.tryEval (builtins.stringLength f.assertion.message);
    in if r.success then f.assertion.message else "<message unavailable>";
in
if n == 0
then pkgs.runCommand "grammar-check" {
  nativeBuildInputs = [ pkgs.coreutils ];
} ''
  echo "✅ grammar check passed!"
  echo "   languages: ${builtins.concatStringsSep ", " languages}"

  touch $out
''
else throw (
  "🦆 Grammar check failed: ${toString n} assertion(s) across ${toString nLangs} language(s) "
  + "(${builtins.concatStringsSep ", " failedLangs}):\n"
  + builtins.concatStringsSep "\n" (map (f: "  • [${f.language}] " + renderMessage f) failures)
)
