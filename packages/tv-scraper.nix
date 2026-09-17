{
  self,
  stdenv,
  lib,
  python3,
} : let # 🦆 says ⮞ python dependencies
  pythonEnv = python3.withPackages (ps: [
    ps.requests
    ps.lxml
  ]);
  cargoSrc = ./zigduck;
  cargoToml = builtins.fromTOML (builtins.readFile (cargoSrc + "/Cargo.toml"));
  cargoVersion = cargoToml.package.version;
in  # 🦆 says ⮞ code source
stdenv.mkDerivation {
    pname = "tv-scraper";
    src = ./tv-scraper;
    version = cargoVersion;
    buildInputs = [ pythonEnv ];
    propagatedBuildInputs = [ pythonEnv ];

    installPhase = ''
      mkdir -p $out/bin
      echo "#!${pythonEnv}/bin/python3" > $out/bin/tv-scraper
      cat $src/tv-scraper.py >> $out/bin/tv-scraper
      chmod +x $out/bin/tv-scraper
    '';

    meta = {
      description = "TV-scraper that's configurable";
      license = lib.licenses.mit;
      maintainers = [ "QuackHack-McBlindy" ];
      version = cargoVersion;

    };}
