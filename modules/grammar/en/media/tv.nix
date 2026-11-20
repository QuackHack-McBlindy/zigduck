{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
} : let # 🦆 says ⮞ used for season entity lists

in {

  yo.scripts.tv = {
    voice = lib.mkIf (lib.elem "en" config.house.languages) {
        priority = 1; # 🦆 says ⮞ 1 to 5
        fuzzy = {
          enable = true;
          threshold = 0.6;
        };
        sentences = [
          # 🦆 says ⮞ season specific search
          "[i] (play|start|run) [up] {typ} {search} (season) {season} in {room}"
          "i want to watch {typ} {search} (season) {season} in {room}"
          "[i] (play|start|run) [up] {typ} {search} (season) {season}"
          "i want to watch {typ} {search} (season) {season}"
          # 🦆 says ⮞ room specific device control
          "[i] (play|start|run) [up] {typ} {search} in {room}"
          "i want to watch {typ} {search} in {room}"
          "i want to listen to {typ} in {room}"
          "i want to hear {typ} {search} in {room}"
          "{typ} (volume|the volume|episode|the episode|song|the song) in {room}"
          "tv {typ} in {room}"
          # 🦆 says ⮞ default player
          "[i] (play|start|run) [up] {typ} {search}"
          "i want to watch {typ} {search}"
          # 🦆 says ⮞ listen to starred tracks
          "i want to listen to [my] {typ}"
          "i want to hear [my] {typ}"
          "play [my] {typ} [songs]"
          # 🦆 says ⮞ up volume
          "{typ} (volume|the volume|episode|the episode|song|the song)"
          "tv {typ}"
          # 🦆 says ⮞ append to favorites playlist
          "{typ} in [favorites|the playlist]"
          "{typ} this [song] in [favorites|the playlist]"
          "{typ} [this] [song] to [favorites|the playlist]"
          # 🦆 says ⮞ find remote
          "call {typ}"
          "find {typ}"
        ]; # 🦆 says ⮞ lists are in word > out word
        lists = { # swap 🦆 says ⮞ long list incomin' yo
          typ.values = [
          # 🦆 says ⮞ media
            { "in" = "series|show|the show|tv series|tv-series"; out = "tv"; }
            { "in" = "pod|podcast|the podcast"; out = "podcast"; }
            { "in" = "random|shuffle|music|mix"; out = "jukebox"; }
            { "in" = "artist|the artist|band|the band|group|the group"; out = "music"; }
            { "in" = "song|the song|track|the track|tune"; out = "song"; }
            { "in" = "movie|the movie|film|the film"; out = "movie"; }
            { "in" = "audiobook|the audiobook|audio book"; out = "audiobook"; }
            { "in" = "video|the video"; out = "othervideo"; }
            { "in" = "musicvideo|music video"; out = "musicvideo"; }
            { "in" = "channel|the channel"; out = "livetv"; }
            { "in" = "youtube|you-tube|you|yt|tube"; out = "youtube"; }
            { "in" = "news|the news|latest news"; out = "news"; }
          # 🦆 says ⮞ play starred tracks
            { "in" = "playlist|the playlist|play list"; out = "favourites"; }
            { "in" = "favorite|favorites|favourite|favourites"; out = "favourites"; }
          # 🦆 says ⮞ playback
            { "in" = "pause|mute|stop|quiet"; out = "pause"; }
            { "in" = "play|continue|resume|ok"; out = "play"; }
            { "in" = "raise|increase|up|turn up"; out = "up"; }
            { "in" = "lower|decrease|down|turn down"; out = "down"; }
            { "in" = "next|forward|skip"; out = "next"; }
            { "in" = "previous|back|backward"; out = "previous"; }
          # 🦆 says ⮞ star currently playing
            { "in" = "save|add|star"; out = "star"; }
          # 🦆 says ⮞ on/off
            { "in" = "off|turn off"; out = "off"; }
            { "in" = "on|turn on"; out = "on"; }
          # 🦆 says ⮞ calls remote
            { "in" = "remote|the remote|remote control"; out = "call"; }
          ]; # 🦆 says ⮞ search can be anything
          search.wildcard = true;
          # 🦆 says ⮞ hardcoded device names
          room.values = [
            { "in" = "bedroom"; out = "bedroom"; }
            { "in" = "livingroom|living room"; out = "livingroom"; }
          ]; # 🦆 says ⮞ or use device name from Nix config
          # device.values = let
          #   devices = lib.attrValues config.house.tv;
          # in map (device: {
          #   "in" = "[${device.room}|${lib.head (lib.splitString "." device.ip)}]";
          #   out = device.ip;
          # }) devices;
          season.values = en.numberFromOneTo 50;
        };
    };

  };}
