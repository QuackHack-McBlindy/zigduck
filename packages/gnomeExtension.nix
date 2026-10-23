{
  self,
  stdenv,
  lib,
  pkgs,
  ...
} : let

in  # 🦆 says ⮞ code source
stdenv.mkDerivation {
  version = "0.1.2";
  pname = "gnomeExtension";
  src = ./gnomeExtension;
  nativeBuildInputs = [
    pkgs.glib
  ];

  installPhase = ''
    runHook preInstall
    install -d "$out/share/gnome-shell/extensions"
    cp -r . "$out/share/gnome-shell/extensions/zigduck@quackhack-mcblindy.com"
    runHook postInstall
  '';

  meta = with lib; {
    description = "Zigduck smart home controls for GNOME Shell";
    license = licenses.mit;
    maintainers = [ "QuackHack-McBlindy" ];

  };}
