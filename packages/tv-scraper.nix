# ddotfiles/packages/tv.nix ⮞ https://github.com/QuackHack-McBlindy/dotfiles
{ 
  self,
  stdenv,
  lib,
  python3,
} : let # 🦆 says ⮞ python dependencies
  pythonEnv = python3.withPackages (ps: [
    ps.sounddevice
    ps.requests
    ps.python-dotenv
  ]);
  cargoSrc = ./zigduck;
  cargoToml = builtins.fromTOML (builtins.readFile (cargoSrc + "/Cargo.toml"));
  cargoVersion = cargoToml.package.version;
in  # 🦆 says ⮞ code source
stdenv.mkDerivation {
    name = "tv-scraper";
    src = ./tv-scraper;

    buildInputs = [ pythonEnv ];
    propagatedBuildInputs = [ pythonEnv ];

    installPhase = ''
      mkdir -p $out/bin
      echo "#!${pythonEnv}/bin/python3" > $out/bin/tv
      cat $src/tv.py >> $out/bin/tv
      chmod +x $out/bin/tv
    '';

    meta = {
      description = "TV-scraper";
      license = lib.licenses.mit;
      maintainers = [ "QuackHack-McBlindy" ];
      version = cargoVersion;
      
    };}

