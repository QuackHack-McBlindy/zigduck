{
  self,
  lib,
  pkgs,
  rustPlatform,
  fetchFromGitHub,
  ...
} : let
  src = ./zigduck;
  cargoToml = builtins.fromTOML (builtins.readFile (src + "/Cargo.toml"));
  name = cargoToml.package.name;
  version = cargoToml.package.version;
  desc = cargoToml.package.description;
  licen = cargoToml.package.license;  
in  
rustPlatform.buildRustPackage {
  pname = name;
  inherit version;
  src = src;
  cargoLock = { lockFile = src + "/Cargo.lock"; };

  env.CMAKE_POLICY_VERSION_MINIMUM = "3.5";

  nativeBuildInputs = [
    pkgs.pkg-config
    pkgs.cmake
    pkgs.libclang
    rustPlatform.bindgenHook
  ];

  buildInputs = [ 
    pkgs.openssl.dev
    pkgs.mosquitto
    pkgs.zigbee2mqtt
  ];

  meta = with lib; {
    description = desc;
    license = licen;
    maintainers = [ "QuackHack-McBlindy" ];
    mainProgram = "zigduck";
    
  };}
