---
title: Media and TV
description: Set up the media library, Android TVs over ADB, channels and TV guide scraping.
sidebar:
  label: Media and TV
---

zigduck controls Android TVs over `adb` with the included [`tv`](../../usage/tv/) package.
Everything is declarative, down to the TV guide (EPG) scraping. Scraping uses smart defaults, and you
can override them for all channels or per channel.

The `tv-scraper` tool writes the guide as XML, JSON and HTML. The GNOME extension reads the JSON
guide from `~/.local/share/zigduck/epg.json`, which is the scraper's default output path.

## Media library and HTTPS

Android TV needs an HTTPS URL to play external `.m3u` playlists, so point a domain with a valid TLS
certificate at your media root. The domain doesn't need to be reachable from the internet and no
router port has to be opened, as long as the certificate is valid.

```nix
house = {
  https.media.url = "https://my-media-domain.org";
  # Or keep the URL out of Git. The file holds just the URL.
  # https.media.urlFile = config.sops.secrets.webserver.path;

  # Root of the media library. The URL above should serve this directory.
  media.root = "/Pool";

  # YouTube Data API v3 key
  media.youtubePasswordFile = config.sops.secrets.youtubeAPI.path;

  # Folders for each media type
  media = {
    movies      = "/Pool/Movies";
    tv          = "/Pool/TV";
    music       = "/Pool/Music";
    musicVideos = "/Pool/Music_Videos";
    otherVideos = "/Pool/Other_Videos";
    podcasts    = "/Pool/Podcasts";
  };
};
```

Each media option's description in the [`house.media` reference](../../reference/options/media/)
explains the folder layout `tv` expects, such as `Season 1` folders for TV shows.

## TVs

```nix
house.tv = {
  "my-tv" = {
    ip = "192.168.1.123";
    room = "bedroom";

    # Apps, by activity name
    apps = {
      telenor = "se.telenor.stream/.MainActivity";
      tv4 = "se.tv4.tv4playtab/se.tv4.tv4play.ui.mobile.main.BottomNavigationActivity";
    };

    channels = {
      "1" = {
        name = "SVT1";
        id = 1;
        # Or play a direct stream:
        # stream_url = "https://url.com/";
        # Or launch an app-based channel:
        cmd = "open_telenor && wait 5 && start_channel_1";

        # Page tv-scraper reads the guide for this channel from
        scrape_url = "https://tv-tabla.se/tabla/svt1/";

        # Per-channel scraper overrides
        scraper = {
          row_xpath   = ''//table[@id="channel-schedule"]//tr'';
          time_xpath  = ".//time";
          time_attr   = "datetime";
          title_xpath = ''..//a[contains(@class, "program-title")]'';
          desc_xpath  = ".//p";
          time_formats = [ "%H:%M" "%H.%M" ];
          time_strip_pattern = "[^\\d:\\.]";
          default_duration_minutes = 30;
          pm_heuristic_after_hour = 12;
        };
      };
      # ...
    };
  };

  "my-other-tv" = {
    ip = "192.168.1.124";
    room = "livingroom";
    isDefault = true;
  };
};
```

:::note
Turn on network debugging in each TV's developer options so `adb` can connect. Installing VLC on
the TV is strongly recommended for playlist playback.
:::

A channel plays using `cmd` first, then `stream_url`, then `id`.

## Options

- [`house.media`](../../reference/options/media/)
- [`house.tv`](../../reference/options/tv/), including `keymap` and every `scraper` field
- [`house.https`](../../reference/options/https/)
