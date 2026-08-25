{
  self,
  lib,
  config,
  ...
}: let
  # English number words (0-60) – enough for TV seasons
  englishNumbers = [
    "zero" "one" "two" "three" "four" "five" "six" "seven" "eight" "nine" "ten"
    "eleven" "twelve" "thirteen" "fourteen" "fifteen" "sixteen" "seventeen" "eighteen" "nineteen" "twenty"
    "twenty-one" "twenty-two" "twenty-three" "twenty-four" "twenty-five" "twenty-six" "twenty-seven" "twenty-eight" "twenty-nine" "thirty"
    "thirty-one" "thirty-two" "thirty-three" "thirty-four" "thirty-five" "thirty-six" "thirty-seven" "thirty-eight" "thirty-nine" "forty"
    "forty-one" "forty-two" "forty-three" "forty-four" "forty-five" "forty-six" "forty-seven" "forty-eight" "forty-nine" "fifty"
    "fifty-one" "fifty-two" "fifty-three" "fifty-four" "fifty-five" "fifty-six" "fifty-seven" "fifty-eight" "fifty-nine" "sixty"
  ];
  englishNumber = n: builtins.elemAt englishNumbers n;   # n is 1-based index (so "one" at 1)
in {
  yo.scripts.tv = {
    description = "Android TV Controller. Fuzzy search all media types and creates playlist and serves over webserver for casting.";
    binary = self.inputs.zigduck2mqttnix.packages.x86_64-linux.tv + "/bin/tv";
    category = "🎧 Media Management";
    logLevel = "INFO";
    parameters = [
      {
        name = "typ";
        description = ''
          Specify the type of command or the media type to search for.
          Supported commands are:
            on, off, up, down, call, favourites, star.
          Media Types:
            tv, movie, livetv, podcast, music, song, musicvideo, jukebox (random music), othervideo, youtube.
          Device Navigation:
            nav_up, nav_down, nav_left, nav_right, nav_select, nav_menu, nav_back
        '';
        default = "tv";
        optional = true;
        values = [
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

    
    voice = {
      priority = 1; # 1-5
      sentences = [
        # Season-specific search
        "[I] (play|start|watch) {typ} {search} season {season} in {room}"
        "I want to watch {typ} {search} season {season} in {room}"
        "[I] (play|start|watch) {typ} {search} season {season}"
        "I want to watch {typ} {search} season {season}"
        # Room-specific device control
        "[I] (play|start|watch) {typ} {search} in {room}"
        "I want to watch {typ} {search} in {room}"
        "I want to listen to {typ} in {room}"
        "I want to hear {typ} {search} in {room}"
        "{typ} (volume|episode|song|stuff) in {room}"
        "tv {typ} in {room}"
        # Default player (no room specified)
        "[I] (play|start|watch) {typ} {search}"
        "I want to watch {typ} {search}"
        "I want to listen to [my] {typ}"
        "I want to hear [my] {typ}"
        "play my {typ} [songs]"
        "{typ} (volume|episode|song|stuff)"
        "tv {typ}"
        # Append to favourites playlist
        "save to {typ}"
        "add this [song] to {typ}"
        # Find remote (e.g. Nvidia Shield)
        "ring {typ}"
        "find {typ}"
      ];

      lists = {
        typ.values = [
          # Media types
          { "in" = "series|show|tv show|tv series"; out = "tv"; }
          { "in" = "podcast|pod|pods"; out = "podcast"; }
          { "in" = "random|shuffle|music mix|jukebox"; out = "jukebox"; }
          { "in" = "artist|band|group|musician"; out = "music"; }
          { "in" = "song|track|tune"; out = "song"; }
          { "in" = "movie|film|flick"; out = "movie"; }
          { "in" = "audiobook|audio book"; out = "audiobook"; }
          { "in" = "video|clip"; out = "othervideo"; }
          { "in" = "music video|musicvideo"; out = "musicvideo"; }
          { "in" = "channel|live tv|tv channel"; out = "livetv"; }
          { "in" = "youtube|you tube|yt|tube"; out = "youtube"; }
          { "in" = "news|news channel|latest news"; out = "news"; }
          # Play favourites
          { "in" = "playlist|favorites|favourites|favourite songs"; out = "favourites"; }
          # Playback controls
          { "in" = "pause|stop|mute"; out = "pause"; }
          { "in" = "play|resume|continue"; out = "play"; }
          { "in" = "up|increase volume|louder"; out = "up"; }
          { "in" = "down|decrease volume|quieter"; out = "down"; }
          { "in" = "next|next track|forward"; out = "next"; }
          { "in" = "previous|prev|back"; out = "previous"; }
          # Star (add to favourites)
          { "in" = "save|add|star|favorite|favourite"; out = "star"; }
          # Power
          { "in" = "off|turn off"; out = "off"; }
          { "in" = "on|turn on"; out = "on"; }
          # Find remote
          { "in" = "remote|remote control|find remote"; out = "call"; }
        ];

        search.wildcard = true;

        room.values = let
          # generate room patterns from config.house.rooms (or fallback from devices)
          roomNames = if (builtins.hasAttr "rooms" config.house) then
            builtins.attrNames config.house.rooms
          else
            builtins.attrNames (lib.groupBy (d: d.room) (lib.attrValues zigbeeDevices));

          sanitizeRoom = str: lib.toLower (lib.replaceStrings [ " " "/" ] [ "" "_" ] str);
          englishRoomPatterns = room: [
            room                                   # original
            "the ${room}"                          # with article
            "${room}s"                             # plural
            "the ${room}s"                         # plural with article
            (sanitizeRoom room)                    # sanitized (if spaces)
            "the ${sanitizeRoom room}"
          ];
        in
          lib.forEach roomNames (room: {
            "in" = "[" + lib.concatStringsSep "|" (lib.unique (englishRoomPatterns room)) + "]";
            out = room;
          });

        # Generate season values dynamically (1-60)
        season.values = builtins.genList (
          i: let n = i + 1; in {
            "in" = "${toString n}|${englishNumber n}";   # accepts both digit and word
            out = toString n;                            # output the digit
          }
        ) 60;
      };
    };
  };
}
