{
  description = "zigduck is a complete home automation system in Nix and Rust.";
  inputs = {
    nixpkgs.url   = "github:NixOS/nixpkgs/nixos-unstable";
    tinyFlake.url = "github:quackhack-mcblindy/tinyFlake";
    yo.url        = "github:quackhack-mcblindy/yo";
  };

  outputs = { self, nixpkgs, tinyFlake, ... }@inputs:
    tinyFlake.lib.mkFlake {
      inherit self inputs;
      systems   = [ "x86_64-linux" "aarch64-linux" ];
      packages  = tinyFlake.lib.mapModules ./packages import;
      devShells = tinyFlake.lib.mapModules ./devShells (path: import path);
      checks = tinyFlake.lib.mapModules ./tests (path: import path);
      nixosModules.zigduck = {
        imports = [
          self.inputs.yo.nixosModules.yo
          (import ./modules)
        ];
      };

    };}
