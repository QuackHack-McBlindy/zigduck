#!/usr/bin/env python3
"""
Standalone TV schedule scraper.
Reads channel configuration from a JSON file, scrapes schedules from websites,
and generates EPG XML, JSON, and an HTML guide.

Usage:
    python tv-scraper.py [OPTIONS]

Defaults (can be overridden):
    --config /etc/zigduck/tv-defaults.json
    --device shield
    --xml-out epg.xml
    --json-out epg.json
    --html-out tv.html
    --debug-dir None

To disable an output, pass an empty string, e.g., --json-out ""

Config layout (per-channel "scraper" blocks are optional):
{
  "tvs": {
    "shield": {
      "scraper": { ... applies to every channel ... },
      "channels": {
        "svt1": {
          "id": 1,
          "name": "SVT1",
          "icon": "/path/icon.png",
          "scrape_url": "https://tv-tabla.se/tabla/svt1/",
          "scraper": { ... overrides just for this channel ... }
        }
      }
    }
  }
}
"""

import argparse
import json
import logging
import os
import re
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET

import requests
from lxml import html


TIME_OFFSET = timedelta(hours=0)   # global default; can be overridden per-scraper


# Default scraper configuration. Reproduces the original hardcoded behavior.
# Keys can be overridden per-device and/or per-channel via a "scraper" block.
DEFAULT_SCRAPER_CONFIG = {
    # XPath selecting each programme row
    "row_xpath": '//table[@id="channel-schedule"]//tr',
    # XPath (relative to a row) locating the <time> element
    "time_xpath": './/time',
    # Attribute on the time element to read. If missing/empty, text is used.
    # Set to "" (or null) to always use the element's text.
    "time_attr": "datetime",
    # XPath (relative to a row) locating the title element
    "title_xpath": './/a[contains(@class, "program-title")]',
    # XPath (relative to a row) locating the description element; "" to disable
    "desc_xpath": './/p',
    # strptime formats to try, in order. ISO 8601 is always attempted first.
    # 24h:  "%H:%M", "%H.%M"
    # 12h:  "%I:%M %p", "%I:%M%p", "%I %p"
    "time_formats": ["%H:%M", "%H.%M"],
    # Regex stripping noise from the raw time string before strptime.
    # null disables stripping (needed if the AM/PM marker must be preserved).
    "time_strip_pattern": r"[^\d:\.]",
    # Used when the "next" programme's start can't be parsed.
    "default_duration_minutes": 30,
    # Per-scraper timezone shift, in hours. null => use global TIME_OFFSET.
    "timezone_offset_hours": None,
    # If the time format uses %I but NOT %p and the previous entry was at or
    # after this hour, ambiguous AM hours are bumped to PM. Set to null to
    # disable (default). Typical value for TV schedules: 12.
    "pm_heuristic_after_hour": None,
}


logger = logging.getLogger("tv-scraper")
logger.setLevel(logging.INFO)
formatter = logging.Formatter("[🦆📜] %(levelname)s - %(message)s")

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


def _merge_scraper_config(*configs):
    """Merge scraper configs left-to-right over the defaults."""
    merged = dict(DEFAULT_SCRAPER_CONFIG)
    for cfg in configs:
        if cfg:
            merged.update(cfg)
    return merged


def _scraper_offset(cfg):
    hours = cfg.get("timezone_offset_hours")
    if hours is None:
        return TIME_OFFSET
    return timedelta(hours=hours)


def _parse_datetime(raw_time, current_date, cfg, previous_dt=None):
    """Parse a time string into a datetime using the given scraper config.

    Returns None if unparseable.
    """
    if raw_time is None:
        return None
    raw_time = str(raw_time).strip()
    if not raw_time:
        return None

    offset = _scraper_offset(cfg)


    try:
        return datetime.fromisoformat(raw_time) + offset
    except ValueError:
        pass

    cleaned = raw_time
    strip_pat = cfg.get("time_strip_pattern")
    if strip_pat:
        cleaned = re.sub(strip_pat, "", raw_time)

    formats = cfg.get("time_formats") or []
    pm_after = cfg.get("pm_heuristic_after_hour")

    for fmt in formats:
        for candidate in (cleaned, raw_time):
            if not candidate:
                continue
            try:
                parsed = datetime.strptime(candidate, fmt)
            except ValueError:
                continue

            if any(tok in fmt for tok in ("%Y", "%y", "%d", "%j")):
                return parsed + offset

            dt = datetime.combine(current_date, parsed.time())

            if ("%I" in fmt and "%p" not in fmt
                    and pm_after is not None
                    and previous_dt is not None
                    and previous_dt.hour >= pm_after
                    and dt.hour < pm_after):
                dt += timedelta(hours=12)

            return dt + offset

    return None


def scrape_schedule(url, channel_id, scraper_cfg, debug_dir=None):
    """Fetch and parse a TV schedule page.

    Returns a list of dicts with keys: time, program, description.
    """
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        logger.info(f"Fetching {url} for channel {channel_id}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        if debug_dir:
            os.makedirs(debug_dir, exist_ok=True)
            debug_path = os.path.join(debug_dir, f"{channel_id}.html")
            with open(debug_path, "w", encoding="utf-8") as f:
                f.write(response.text)
            logger.info(f"Saved debug HTML to {debug_path}")

        tree = html.fromstring(response.content)

        row_xpath = scraper_cfg["row_xpath"]
        time_xpath = scraper_cfg["time_xpath"]
        time_attr = scraper_cfg.get("time_attr")
        title_xpath = scraper_cfg["title_xpath"]
        desc_xpath = scraper_cfg.get("desc_xpath")

        schedule = []
        rows = tree.xpath(row_xpath)
        for row in rows:
            time_els = row.xpath(time_xpath)
            title_els = row.xpath(title_xpath)
            desc_els = row.xpath(desc_xpath) if desc_xpath else []

            if not time_els or not title_els:
                continue

            time_el = time_els[0]
            time_text = None
            if time_attr:
                time_text = time_el.get(time_attr)
            if not time_text:
                time_text = time_el.text_content().strip()

            title = title_els[0].text_content().strip()
            description = desc_els[0].text_content().strip() if desc_els else "No description"

            schedule.append({
                "time": time_text,
                "program": title,
                "description": description,
            })

        logger.info(f"Found {len(schedule)} programs for {channel_id}")
        return schedule

    except Exception as e:
        logger.error(f"Failed to scrape {url}: {str(e)}", exc_info=True)
        return None


def build_epg(channels, xml_out, json_out=None, debug_dir=None):
    """Scrape all channels, build EPG XML and JSON."""
    root = ET.Element("tv", attrib={
        "generator-info-name": "DuckEPG-Generator",
        "generator-info-url": "https://tv-tabla.se",
    })

    json_data = {
        "generator": "DuckEPG-Generator",
        "generator_url": "https://tv-tabla.se",
        "channels": [],
    }

    for channel in channels:
        channel_id = channel["id"]
        channel_name = channel.get("name", f"Channel {channel_id}")
        url = channel["url"]
        scraper_cfg = channel["scraper_cfg"]

        schedule = scrape_schedule(url, channel_id, scraper_cfg, debug_dir)
        if not schedule:
            logger.warning(f"No schedule data found for {url}, skipping channel.")
            continue

        ch = ET.SubElement(root, "channel", id=channel_id)
        display_name = ET.SubElement(ch, "display-name")
        display_name.text = channel_name

        json_channel = {
            "id": channel_id,
            "name": channel_name,
            "programs": [],
        }

        current_date = datetime.now().date()

        parsed_starts = []
        prev = None
        for entry in schedule:
            dt = _parse_datetime(entry["time"], current_date, scraper_cfg, previous_dt=prev)
            parsed_starts.append(dt)
            if dt is not None:
                prev = dt

        default_duration = timedelta(
            minutes=scraper_cfg.get("default_duration_minutes", 30)
        )

        for i, entry in enumerate(schedule):
            try:
                start_dt = parsed_starts[i]
                if start_dt is None:
                    logger.warning(f"Could not parse time: {entry['time']}")
                    continue

                stop_dt = None
                if i < len(schedule) - 1:
                    next_dt = parsed_starts[i + 1]
                    if next_dt is not None:
                        if next_dt < start_dt:
                            next_dt += timedelta(days=1)
                        stop_dt = next_dt

                if stop_dt is None:
                    stop_dt = start_dt + default_duration

                start_str = start_dt.strftime("%Y%m%d%H%M%S +0000")
                stop_str = stop_dt.strftime("%Y%m%d%H%M%S +0000")

                programme = ET.SubElement(
                    root, "programme",
                    start=start_str, stop=stop_str, channel=channel_id,
                )
                title = ET.SubElement(programme, "title", lang="sv")
                title.text = entry.get("program", "Unknown Program")
                desc = ET.SubElement(programme, "desc", lang="sv")
                desc.text = entry.get("description", "No description")

                json_channel["programs"].append({
                    "channel_id": channel_id,
                    "start": start_str,
                    "stop": stop_str,
                    "title": entry.get("program", "Unknown Program"),
                    "description": entry.get("description", "No description"),
                })

            except Exception as e:
                logger.error(f"Error processing program entry: {str(e)}", exc_info=True)

        json_data["channels"].append(json_channel)
        logger.info(f"Added programs for channel {channel_id}")

    tree = ET.ElementTree(root)
    tree.write(xml_out, encoding="UTF-8", xml_declaration=True)
    logger.info(f"EPG XML data written to {xml_out}")

    if json_out:
        with open(json_out, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        logger.info(f"EPG JSON data written to {json_out}")

    return json_data


def generate_html(epg_xml_path, html_out_path, icons=None):
    """Generate a self-contained HTML TV guide from the EPG XML."""
    icons = icons or {}
    try:
        tree = ET.parse(epg_xml_path)
        root = tree.getroot()

        channels = {}
        for ch in root.findall("channel"):
            ch_id = ch.get("id")
            ch_name = ch.findtext("display-name", default=ch_id)
            channels[ch_id] = ch_name

        programmes = []
        for prog in root.findall("programme"):
            channel_id = prog.get("channel")
            start = prog.get("start")
            stop = prog.get("stop")
            title = prog.findtext("title", default="")
            desc = prog.findtext("desc", default="")

            title = (title or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            desc = (desc or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            programmes.append({
                "channel": channel_id,
                "start": start,
                "stop": stop,
                "title": title,
                "desc": desc,
            })

        programmes.sort(key=lambda x: (
            int(x["channel"]) if x["channel"].isdigit() else 0, x["start"],
        ))

        html_content = []
        html_content.append("<!DOCTYPE html>")
        html_content.append("<html>")
        html_content.append("<head>")
        html_content.append('<meta charset="UTF-8">')
        html_content.append("<style>")
        html_content.append("""
            body { font-family: sans-serif; margin: 20px; }
            .channel { margin: 10px 0; padding: 10px; border-bottom: 1px solid #ccc; }
            .channel-header { display: flex; align-items: center; margin-bottom: 10px; }
            .channel-icon { width: 32px; height: 32px; margin-right: 10px; }
            .channel-name { font-weight: bold; font-size: 1.2em; }
            .program { margin: 5px 0; padding: 8px; cursor: pointer; border-radius: 4px; transition: background-color 0.2s; }
            .program:hover { background-color: #f5f5f5; }
            .program.ended { background-color: #f8f8f8; color: #999; }
            .program.current { background-color: #fff3cd; border-left: 4px solid #ffc107; }
            .program-time { color: #666; font-size: 0.9em; margin-right: 10px; font-family: monospace; }
            .program-title { font-weight: bold; }
            .program-description { display: none; margin-top: 8px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 0.9em; color: #555; }
            .program-description.show { display: block; }
        """)
        html_content.append("</style>")
        html_content.append("</head>")
        html_content.append("<body>")

        current_channel = None
        for prog in programmes:
            ch_id = prog["channel"]
            if ch_id != current_channel:
                if current_channel is not None:
                    html_content.append("</div>")

                current_channel = ch_id
                ch_name = channels.get(ch_id, ch_id)
                html_content.append('<div class="channel">')
                html_content.append('<div class="channel-header">')

                icon_path = icons.get(ch_id)
                if icon_path and os.path.isfile(icon_path):
                    html_content.append(
                        f'<img class="channel-icon" src="file://{icon_path}" alt="{ch_name}">'
                    )
                else:
                    html_content.append(
                        f'<div class="channel-icon" style="background:#ddd;text-align:center;'
                        f'line-height:32px;">{ch_id}</div>'
                    )

                html_content.append(f'<span class="channel-name">{ch_name}</span>')
                html_content.append("</div>")

            start_str = prog["start"]
            stop_str = prog["stop"]
            try:
                start_clean = start_str.split(" ")[0]
                stop_clean = stop_str.split(" ")[0]
                start_dt = datetime.strptime(start_clean, "%Y%m%d%H%M%S")
                stop_dt = datetime.strptime(stop_clean, "%Y%m%d%H%M%S")
                start_epoch = int(start_dt.timestamp())
                stop_epoch = int(stop_dt.timestamp())
                display_start = start_dt.strftime("%H:%M")
                display_stop = stop_dt.strftime("%H:%M")
            except Exception:
                start_epoch = 0
                stop_epoch = 0
                display_start = start_str
                display_stop = stop_str

            html_content.append(
                f'<div class="program" data-start="{start_epoch}" data-end="{stop_epoch}" '
                f'onclick="toggleDescription(this)">'
            )
            html_content.append(
                f'<span class="program-time">{display_start} - {display_stop}</span>'
            )
            html_content.append(f'<span class="program-title">{prog["title"]}</span>')
            html_content.append(f'<div class="program-description">{prog["desc"]}</div>')
            html_content.append("</div>")

        if current_channel is not None:
            html_content.append("</div>")

        html_content.append("""
        <script>
        function toggleDescription(element) {
          const description = element.querySelector('.program-description');
          description.classList.toggle('show');
        }

        function updateCurrentPrograms() {
            const now = Math.floor(Date.now() / 1000);
            document.querySelectorAll('.program').forEach(program => {
                const start = parseInt(program.dataset.start);
                const end = parseInt(program.dataset.end);
                program.classList.remove('current', 'ended');
                if (now >= start && now < end) {
                    program.classList.add('current');
                } else if (now >= end) {
                    program.classList.add('ended');
                }
            });
        }

        updateCurrentPrograms();
        setInterval(updateCurrentPrograms, 60000);
        </script>
        """)

        html_content.append("</body>")
        html_content.append("</html>")

        os.makedirs(os.path.dirname(html_out_path) or ".", exist_ok=True)
        with open(html_out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(html_content))
        logger.info(f"HTML TV guide written to {html_out_path}")

    except Exception as e:
        logger.error(f"Failed to generate HTML: {str(e)}", exc_info=True)
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Standalone TV schedule scraper with sensible defaults.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--config", default="/etc/zigduck/tv-defaults.json",
                        help="Path to zigduck tv-defaults.json (default: %(default)s)")
    parser.add_argument("--device", default="shield",
                        help='Which device key under "tvs" to use (default: %(default)s)')
    parser.add_argument("--xml-out", default="epg.xml",
                        help="Output EPG XML file path (default: %(default)s)")
    parser.add_argument("--json-out", default="epg.json",
                        help='Output EPG JSON file path. Use empty string to disable (default: %(default)s)')
    parser.add_argument("--html-out", default="tv.html",
                        help='Output HTML TV guide file path. Use empty string to disable (default: %(default)s)')
    parser.add_argument("--debug-dir", default=None,
                        help="Directory to save raw HTML responses. Use empty string to disable (default: %(default)s)")
    args = parser.parse_args()

    try:
        with open(args.config, "r", encoding="utf-8") as f:
            config_data = json.load(f)

        tvs = config_data.get("tvs", {})
        device = tvs.get(args.device)
        if not device:
            logger.error(f"Device '{args.device}' not found in {args.config}")
            return 1

        device_scraper = device.get("scraper") or {}

        channels = []
        icons = {}
        for ch_key, ch in device.get("channels", {}).items():
            url = ch.get("scrape_url")
            if not url:
                logger.warning(f"Channel {ch_key} has no scrape_url, skipping")
                continue
            ch_id = str(ch.get("id", ch_key))

            scraper_cfg = _merge_scraper_config(device_scraper, ch.get("scraper"))

            channels.append({
                "id": ch_id,
                "name": ch.get("name", f"Channel {ch_id}"),
                "url": url,
                "scraper_cfg": scraper_cfg,
            })

            icon = ch.get("icon")
            if icon:
                icons[ch_id] = icon

        if not channels:
            logger.error(f"No scrapeable channels found for device '{args.device}'")
            return 1

    except Exception as e:
        logger.error(f"Failed to load config file: {e}")
        return 1

    try:
        build_epg(channels, args.xml_out, args.json_out, args.debug_dir)
    except Exception as e:
        logger.error(f"EPG building failed: {e}", exc_info=True)
        return 1

    if args.html_out:
        try:
            generate_html(args.xml_out, args.html_out, icons)
        except Exception as e:
            logger.error(f"HTML generation failed: {e}")
            return 1

    return 0


if __name__ == "__main__":
    exit(main())
