{
  self,
  lib,
  config,
  pkgs,
  de,
  ...
} : let

in {
  yo.scripts.tv = {
    voice = lib.mkIf (lib.elem "de" config.house.languages) {
        sentences = [
          # 🦆 sagt ⮞ Suche nach einer bestimmten Staffel
          "[ich] (spiel|spiele|führ|starte|start) [ab|los] {typ} {search} (staffel|season) {season} in {room}"
          "ich möchte {typ} {search} (staffel|season) {season} in {room} sehen"
          "[ich] (spiel|spiele|führ|starte|start) [ab|los] {typ} {search} (staffel|season) {season}"
          "ich möchte {typ} {search} (staffel|season) {season} sehen"

          # 🦆 sagt ⮞ Gerätesteuerung für einen bestimmten Raum
          "[ich] (spiel|spiele|führ|starte|start) [ab|los] {typ} {search} in {room}"
          "ich möchte {typ} {search} in {room} sehen"
          "ich möchte {typ} in {room} hören"
          "ich möchte {typ} {search} in {room} hören"
          "{typ} (lautstärke|ton|folge|kapitel|lied|song|mist) in {room}"
          "tv {typ} in {room}"

          # 🦆 sagt ⮞ Standard-Player
          "[ich] (spiel|spiele|führ|starte|start) [ab|los] {typ} {search}"
          "ich möchte {typ} {search} sehen"

          # 🦆 sagt ⮞ Favoriten abspielen
          "ich möchte [meine] {typ} hören"
          "ich möchte [meine] {typ} anhören"
          "spiel meine {typ} [lieder] ab"

          # 🦆 sagt ⮞ Lautstärke erhöhen
          "{typ} (lautstärke|ton|folge|kapitel|lied|song|mist)"
          "tv {typ}"

          # 🦆 sagt ⮞ Zur Favoriten-Playlist hinzufügen
          "{typ} in [favoriten|die playlist]"
          "{typ} dieses [lied] in [favoriten|die playlist]"
          "{typ} zu [dem] [diesem] [lied] in [favoriten|die playlist]"

          # 🦆 sagt ⮞ Fernbedienung finden
          "ruf {typ} an"
          "finde {typ}"
        ]; # 🦆 sagt ⮞ Listen sind nach Eingabe > Ausgabe sortiert

        lists = { # lange Liste im Anmarsch!
          typ.values = [
          # 🦆 sagt ⮞ Medien
            { "in" = "serie|die serie|fernsehserie|tv-serie"; out = "tv"; }
            { "in" = "pod|podcast|der podcast|podcasts"; out = "podcast"; }
            { "in" = "zufall|zufällig|random|musik|mix|shuffle"; out = "jukebox"; }
            { "in" = "künstler|der künstler|band|die band|gruppe|die gruppe"; out = "music"; }
            { "in" = "lied|das lied|song|der song|musikstück"; out = "song"; }
            { "in" = "film|der film"; out = "movie"; }
            { "in" = "hörbuch|das hörbuch"; out = "audiobook"; }
            { "in" = "video|das video"; out = "othervideo"; }
            { "in" = "musikvideo|das musikvideo"; out = "musicvideo"; }
            { "in" = "sender|der sender|fernsehsender"; out = "livetv"; }
            { "in" = "youtube|you-tube|you|yt|yotub|yotube|tube"; out = "youtube"; }
            { "in" = "nachrichten|news|neuigkeiten|aktuelle nachrichten|neuesten nachrichten"; out = "news"; }

          # 🦆 sagt ⮞ Favoriten abspielen
            { "in" = "playlist|die playlist|wiedergabeliste|die wiedergabeliste"; out = "favourites"; }
            { "in" = "favorit|favoriten|lieblingslieder"; out = "favourites"; }

          # 🦆 sagt ⮞ Wiedergabesteuerung
            { "in" = "pause|pausieren|stumm|stummschalten|ton aus|stop|stopp|anhalten"; out = "pause"; }
            { "in" = "play|weiter|fortsetzen|weiterspielen"; out = "play"; }
            { "in" = "lauter|erhöhen|hoch|steigern"; out = "up"; }
            { "in" = "leiser|senken|runter|verringern|reduzieren"; out = "down"; }
            { "in" = "nächste|nächster|weiter|vorwärts|vorspulen"; out = "next"; }
            { "in" = "vorherige|vorheriger|zurück|rückwärts|zurückspulen"; out = "previous"; }

          # 🦆 sagt ⮞ Aktuellen Titel favorisieren
            { "in" = "speichern|hinzufügen|add|ablegen|merken"; out = "star"; }
            #{ "in" = "[favorit|favoriten|beste]"; out = "star"; }

          # 🦆 sagt ⮞ Ein/Aus
            { "in" = "aus|ausschalten|abschalten"; out = "off"; }
            { "in" = "an|einschalten"; out = "on"; }

          # 🦆 sagt ⮞ Fernbedienung aufrufen
            { "in" = "fernbedienung|die fernbedienung"; out = "call"; }
          ];

          # 🦆 sagt ⮞ Suche kann beliebigen Text enthalten
          search.wildcard = true;

          # 🦆 sagt ⮞ Fest definierte Raumnamen
          room.values = [
            { "in" = "schlafzimmer|das schlafzimmer"; out = "bedroom"; }
            { "in" = "wohnzimmer|das wohnzimmer"; out = "livingroom"; }
          ];

          # 🦆 sagt ⮞ Oder Gerätenamen aus der Nix-Konfiguration verwenden
          # device.values = let
          #   devices = lib.attrValues config.house.tv;
          # in map (device: {
          #   "in" = "[${device.room}|${lib.head (lib.splitString "." device.ip)}]";
          #   out = device.ip;
          # }) devices;

          season.values = de.numberFromOneTo 50;
        };
    };

  };}
