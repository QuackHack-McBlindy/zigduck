---
title: tv (Android TV)
description: Cast media, live TV and YouTube to an Android TV over ADB with fuzzy search.
sidebar:
  label: tv (Android TV)
---

The `tv` tool talks to your Android TVs over ADB. It fuzzy-searches your media library, builds a
playlist and tells the TV to play it. It also handles power, playback and remote navigation.

:::note
Set up [Media and TV](../../configuration/media/) first. `tv` reads its devices and library paths
from `/etc/zigduck/tv-defaults.json`, which that configuration generates.
:::

## Examples

```sh
tv --typ on
tv --typ music --search "iron maiden" --ip 192.168.1.123
tv --typ tv --search "big bang theory"
tv --typ song --search "the duck song" --room bedroom
tv --typ youtube --search "play a youtube video"
```

Pick a TV with `--room` or `--ip`. With neither, `tv` uses the TV marked `isDefault`.

## Full help

```text
Cast media to an Android TV device via ADB

Usage: tv [OPTIONS] --typ <TYP>

Options:
  -t, --typ <TYP>              [possible values: on, off, up, down, next, prev, previous, pause, play, call, youtube, tv, movie, podcast, music, musicvideo, audiobook, jukebox, song, othervideo, livetv, play_playlist, nav_up, nav_down, nav_left, nav_right, nav_select, nav_menu, nav_back, channel_up, channel_down, nav_home, nav_recents]
  -s, --search <SEARCH>
      --season <SEASON>
      --room <ROOM>
      --ip <IP>
      --no-shuffle
      --shuffle
      --max-items <MAX_ITEMS>
      --config <CONFIG>        [default: /etc/zigduck/tv-defaults.json]
  -h, --help                   Print help
```

## TV guide scraper

`tv-scraper` builds the electronic program guide from each channel's `scrape_url` and scraper
settings.

```text
tv-scraper [--config /etc/zigduck/tv-defaults.json] [--device shield]
           [--xml-out epg.xml] [--json-out ~/.local/share/zigduck/epg.json]
           [--html-out tv.html] [--debug-dir DIR]
```

Pass an empty string to `--json-out`, `--html-out` or `--debug-dir` to skip that output. The JSON
guide at `~/.local/share/zigduck/epg.json` is what the GNOME extension shows.
