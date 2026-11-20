# dotfiles/bin/media/tv.nix ⮞ https://github.com/quackhack-mcblindy/dotfiles
{ # 🦆 says ⮞ Android TVOS Controller
  self,
  lib,
  config,
  pkgs,
  ...
} : let # 🦆 says ⮞ used for season entity lists

in {

  yo.scripts.tv = {
    description = "Android TV Controller. Fuzzy search all media types and creates playlist and serves over webserver for casting.";
    category = "Media";
    parameters = [
      {
        name = "typ";
        description = ''
          Specify the type of command or the media type to search for.
          Supported commands are:
            on, off, up, down, call, favorites, star.
          Media Types:
            tv, movie, livetv, podcast, music, song, musicvideo, jukebox (random music), othervideo, youtube.
          Device Naviagation:
            nav_up, nav_down, nav_left, nav_right, nav_select, nav_menu, nav_back
        '';
        default = "tv";
        optional = true;
        values = [ # 🦆 says ⮞ listz of allowed values
          "on" "off" "up" "down" "next" "prev" "call" "favourites" "star" "tv" "movie"
          "livetv" "podcast" "music" "song" "musicvideo" "jukebox" "othervideo" "youtube"
          "nav_up" "nav_down" "nav_left" "nav_right" "nav_select" "nav_menu" "nav_back" "channel_up" "channel_down"
        ];
      }
      { name = "search"; type = "string"; description = "Media to search"; optional = true; }
      { name = "room"; description = "Room name of device to play on"; optional = true; }
      { name = "season"; type = "string"; description = "Specific season to play"; optional = true; }
      { name = "shuffle"; type = "bool"; description = "Shuffle Toggle, true or false"; default = true; }
    ];
#    binary = self.inputs.zigduck.packages.x86_64-linux.zigduck-tv + "/bin/tv";
    binary = "/run/current/system/zigduck-tv/bin/zigduck-tv";


  };}
