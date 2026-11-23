{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

in {
  yo.scripts.tv = {
    voice = lib.mkIf (lib.elem "sv" config.house.languages) {
        sentences = [
          # 🦆 says ⮞ season specific search
          "[jag] (spel|spela|kör|start|starta) [upp|igång] {typ} {search} (säsong|season) {season} i {room}"
          "jag vill se {typ} {search} (säsong|season) {season} i {room}"
          "[jag] (spel|spela|kör|start|starta) [upp|igång] {typ} {search} (säsong|season) {season}"
          "jag vill se {typ} {search} (säsong|season) {season}"
          # 🦆 says ⮞ room specific device control
          "[jag] (spel|spela|kör|start|starta) [upp|igång] {typ} {search} i {room}"
          "jag vill se {typ} {search} i {room}"
          "jag vill lyssna på {typ} i {room}"
          "jag vill höra {typ} {search} i {room}"
          "{typ} (volym|volymen|avsnitt|avsnittet|låt|låten|skiten) i {room}"
          "tv {typ} i {room}"
          # 🦆 says ⮞ default player
          "[jag] (spel|spela|kör|start|starta) [upp|igång] {typ} {search}"
          "jag vill se {typ} {search}"
          # 🦆 says ⮞ listen to starred tracks
          "jag vill lyssna på [mina] {typ}"
          "jag vill höra [mina] {typ}"
          "spela upp mina {typ} [låtar]"
          # 🦆 says ⮞ up volume
          "{typ} (volym|volymen|avsnitt|avsnittet|låt|låten|skiten)"
          "tv {typ}"
          # 🦆 says ⮞ append to favorites playlist
          "{typ} i [favoriter|spellistan]"
          "{typ} den här [låten] i [favoriter|spellistan]"
          "{typ} till [den] [här] [låten] i [favoriter|spellistan]"
          # 🦆 says ⮞ find remote
          "ring {typ}"
          "hitta {typ}"
        ]; # 🦆 says ⮞ lists are in word > out word
        lists = { # swap 🦆 says ⮞ long list incomin' yo
          typ.values = [
          # 🦆 says ⮞ media
            { "in" = "serie|serien|tvserien|tv-serien"; out = "tv"; }
            { "in" = "pod|podd|podcost|poddan|podden|podcast"; out = "podcast"; }
            { "in" = "slump|slumpa|random|musik|mix|shuffle"; out = "jukebox"; }
            { "in" = "artist|artisten|band|bandet|grupp|gruppen"; out = "music"; }
            { "in" = "låt|låten|sång|sången|biten"; out = "song"; }
            { "in" = "film|filmen"; out = "movie"; }
            { "in" = "ljudbok|ljudboken"; out = "audiobook"; }
            { "in" = "video|videon"; out = "othervideo"; }
            { "in" = "musicvideo|musikvideo"; out = "musicvideo"; }
            { "in" = "kanal|kanalen|kannal"; out = "livetv"; }
            { "in" = "youtube|you-tube|you|yt|yotub|yotube|yotub|tuben|juden"; out = "youtube"; }
            { "in" = "news|nyhet|nyheter|nyheterna|senaste nytt"; out = "news"; }
          # 🦆 says ⮞ play starred tracks
            { "in" = "spellista|spellistan|spel lista|spel listan"; out = "favourites"; }
            { "in" = "favorit|favoriter"; out = "favourites"; }
          # 🦆 says ⮞ playback
            { "in" = "paus|pause|pausa|tyst|tysta|mute|stop"; out = "pause"; }
            { "in" = "play|fortsätt|okej"; out = "play"; }
            { "in" = "öj|höj|höjj|öka|hej"; out = "up"; }
            { "in" = "sänk|sänkt|ner|ned"; out = "down"; }
            { "in" = "näst|nästa|nästan|next|fram|framåt"; out = "next"; }
            { "in" = "förr|förra|föregående|backa|bakåt"; out = "previous"; }
          # 🦆 says ⮞ star currently playing
            { "in" = "spara|add|adda|addera|lägg"; out = "star"; }
            #{ "in" = "[favorit|favoriter|bästa]"; out = "star"; }
          # 🦆 says ⮞ on/off
            { "in" = "av|stäng av"; out = "off"; }
            { "in" = "på"; out = "on"; }
          # 🦆 says ⮞ calls remote
            { "in" = "fjärren|fjärrkontroll|fjärrkontrollen"; out = "call"; }
          ]; # 🦆 says ⮞ search can be anything
          search.wildcard = true;
          # 🦆 says ⮞ hardcoded device names
          room.values = [
            { "in" = "sovrum|sovrummet|bedroom"; out = "bedroom"; }
            { "in" = "vardagsrum|vardagsrummet|livingroom"; out = "livingroom"; }
          ]; # 🦆 says ⮞ or use device name from Nix config
          # device.values = let
          #   devices = lib.attrValues config.house.tv;
          # in map (device: {
          #   "in" = "[${device.room}|${lib.head (lib.splitString "." device.ip)}]";
          #   out = device.ip;
          # }) devices;
          season.values = sv.numberFromOneTo 50;
        };
    };

  };}
