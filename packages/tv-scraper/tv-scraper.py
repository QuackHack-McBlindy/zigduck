#!/usr/bin/env python3
"""
Standalone TV schedule scraper.
Reads channel configuration from a JSON file, scrapes schedules from websites,
and generates EPG XML, JSON, and an HTML guide.

Usage:
    python epg-generator.py [OPTIONS]

Defaults (can be overridden):
    --config channels.json
    --xml-out epg.xml
    --json-out epg.json
    --html-out tv.html
    --debug-dir debug/

To disable an output, pass an empty string, e.g., --json-out ""
"""

import argparse
import json
import logging
import os
import re
import tempfile
import shutil
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET

import requests
from lxml import html



TIME_OFFSET = timedelta(hours=0)   # TIMEZONE-OFSET !!


logger = logging.getLogger("tv-scraper")
logger.setLevel(logging.INFO)
formatter = logging.Formatter("[🦆📜] %(levelname)s - %(message)s")


console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


def scrape_schedule(url, channel_id, debug_dir=None):
    """Fetch and parse a TV schedule page. Returns list of dicts with time, program, description."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
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

        schedule = []
        rows = tree.xpath('//table[@id="channel-schedule"]//tr')
        for row in rows:
            time_el = row.xpath('.//time')
            title_el = row.xpath('.//a[contains(@class, "program-title")]')
            desc_el = row.xpath('.//p')

            if not time_el or not title_el:
                continue


            datetime_attr = time_el[0].get('datetime')
            if datetime_attr:
                time_text = datetime_attr
            else:
                time_text = time_el[0].text_content().strip()

            title = title_el[0].text_content().strip()
            description = desc_el[0].text_content().strip() if desc_el else "No description"

            schedule.append({
                "time": time_text,
                "program": title,
                "description": description
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
        "generator-info-url": "https://tv-tabla.se"
    })

    json_data = {
        "generator": "DuckEPG-Generator",
        "generator_url": "https://tv-tabla.se",
        "channels": []
    }

    for channel in channels:
        channel_id = channel["id"]
        channel_name = channel.get("name", f"Channel {channel_id}")
        url = channel["url"]

        schedule = scrape_schedule(url, channel_id, debug_dir)
        if not schedule:
            logger.warning(f"No schedule data found for {url}, skipping channel.")
            continue


        ch = ET.SubElement(root, "channel", id=channel_id)
        display_name = ET.SubElement(ch, "display-name")
        display_name.text = channel_name

        json_channel = {
            "id": channel_id,
            "name": channel_name,
            "programs": []
        }

        current_date = datetime.now().date()

        for i, entry in enumerate(schedule):
            try:
                raw_time = entry["time"]
                start_dt = None


                try:
                    start_dt = datetime.fromisoformat(raw_time) + TIME_OFFSET
                except ValueError:
                    time_str = re.sub(r"[^\d:\.]", "", raw_time)
                    time_formats = ["%H:%M", "%H.%M"]
                    start_time = None
                    for fmt in time_formats:
                        try:
                            start_time = datetime.strptime(time_str, fmt).time()
                            break
                        except ValueError:
                            continue
                    if start_time:
                        start_dt = datetime.combine(current_date, start_time) + TIME_OFFSET

                if not start_dt:
                    logger.warning(f"Could not parse time: {raw_time}")
                    continue


                if i < len(schedule) - 1:
                    next_raw = schedule[i + 1]["time"]
                    next_dt = None
                    try:
                        next_dt = datetime.fromisoformat(next_raw) + TIME_OFFSET
                    except ValueError:
                        next_time_str = re.sub(r"[^\d:\.]", "", next_raw)
                        for fmt in time_formats:
                            try:
                                next_time = datetime.strptime(next_time_str, fmt).time()
                                break
                            except ValueError:
                                continue
                        if next_time:
                            next_dt = datetime.combine(current_date, next_time) + TIME_OFFSET
                            if next_dt < start_dt:
                                next_dt += timedelta(days=1)
                    if next_dt:
                        stop_dt = next_dt
                    else:
                        stop_dt = start_dt + timedelta(minutes=30)
                else:
                    stop_dt = start_dt + timedelta(minutes=30)

                start_str = start_dt.strftime("%Y%m%d%H%M%S +0000")
                stop_str = stop_dt.strftime("%Y%m%d%H%M%S +0000")

                programme = ET.SubElement(root, "programme", start=start_str, stop=stop_str, channel=channel_id)
                title = ET.SubElement(programme, "title", lang="sv")
                title.text = entry.get("program", "Unknown Program")
                desc = ET.SubElement(programme, "desc", lang="sv")
                desc.text = entry.get("description", "No description")

                json_program = {
                    "channel_id": channel_id,
                    "start": start_str,
                    "stop": stop_str,
                    "title": entry.get("program", "Unknown Program"),
                    "description": entry.get("description", "No description")
                }
                json_channel["programs"].append(json_program)

            except Exception as e:
                logger.error(f"Error processing program entry: {str(e)}", exc_info=True)

        json_data["channels"].append(json_channel)
        logger.info(f"Added programs for channel {channel_id}")


    tree = ET.ElementTree(root)
    tree.write(xml_out, encoding="UTF-8", xml_declaration=True)
    logger.info(f"EPG XML data written to {xml_out}")


    if json_out:
        with open(json_out, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        logger.info(f"EPG JSON data written to {json_out}")

    return json_data


def generate_html(epg_xml_path, html_out_path, icons_dir=None):
    """Generate a self-contained HTML TV guide from the EPG XML."""
    try:
        tree = ET.parse(epg_xml_path)
        root = tree.getroot()

        channels = {}
        for ch in root.findall('channel'):
            ch_id = ch.get('id')
            ch_name = ch.findtext('display-name', default=ch_id)
            channels[ch_id] = ch_name

        programmes = []
        for prog in root.findall('programme'):
            channel_id = prog.get('channel')
            start = prog.get('start')
            stop = prog.get('stop')
            title = prog.findtext('title', default='')
            desc = prog.findtext('desc', default='')

            title = (title or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            desc = (desc or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            programmes.append({
                'channel': channel_id,
                'start': start,
                'stop': stop,
                'title': title,
                'desc': desc
            })

        programmes.sort(key=lambda x: (x['channel'], x['start']))


        html_content = []
        html_content.append('<!DOCTYPE html>')
        html_content.append('<html>')
        html_content.append('<head>')
        html_content.append('<meta charset="UTF-8">')
        html_content.append('<style>')
        html_content.append('''
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
        ''')
        html_content.append('</style>')
        html_content.append('</head>')
        html_content.append('<body>')

        current_channel = None
        for prog in programmes:
            ch_id = prog['channel']
            if ch_id != current_channel:
                if current_channel is not None:
                    html_content.append('</div>') 

                current_channel = ch_id
                ch_name = channels.get(ch_id, ch_id)
                html_content.append(f'<div class="channel">')
                html_content.append(f'<div class="channel-header">')

                icon_found = None
                if icons_dir:
                    icon_path = os.path.join(icons_dir, f"{ch_id}.png")
                    if os.path.isfile(icon_path):
                        icon_found = icon_path
                if icon_found:
                    html_content.append(f'<img class="channel-icon" src="file://{icon_found}" alt="{ch_name}">')
                else:
                    html_content.append(f'<div class="channel-icon" style="background:#ddd;text-align:center;line-height:32px;">{ch_id}</div>')
                html_content.append(f'<span class="channel-name">{ch_name}</span>')
                html_content.append('</div>')


            start_str = prog['start']
            stop_str = prog['stop']
            try:
                start_clean = start_str.split(' ')[0]
                stop_clean = stop_str.split(' ')[0]
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

            html_content.append(f'<div class="program" data-start="{start_epoch}" data-end="{stop_epoch}" onclick="toggleDescription(this)">')
            html_content.append(f'<span class="program-time">{display_start} - {display_stop}</span>')
            html_content.append(f'<span class="program-title">{prog["title"]}</span>')
            html_content.append(f'<div class="program-description">{prog["desc"]}</div>')
            html_content.append('</div>')

        if current_channel is not None:
            html_content.append('</div>')


        html_content.append('''
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
        ''')

        html_content.append('</body>')
        html_content.append('</html>')

        os.makedirs(os.path.dirname(html_out_path) or '.', exist_ok=True)
        with open(html_out_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(html_content))
        logger.info(f"HTML TV guide written to {html_out_path}")

    except Exception as e:
        logger.error(f"Failed to generate HTML: {str(e)}", exc_info=True)
        raise



def main():
    parser = argparse.ArgumentParser(
        description="Standalone TV schedule scraper with sensible defaults.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--config', default='channels.json',
                        help='Path to JSON config file listing channels (default: %(default)s)')
    parser.add_argument('--xml-out', default='epg.xml',
                        help='Output EPG XML file path (default: %(default)s)')
    parser.add_argument('--json-out', default='epg.json',
                        help='Output EPG JSON file path. Use empty string to disable (default: %(default)s)')
    parser.add_argument('--html-out', default='tv.html',
                        help='Output HTML TV guide file path. Use empty string to disable (default: %(default)s)')
    parser.add_argument('--debug-dir', default='debug/',
                        help='Directory to save raw HTML responses. Use empty string to disable (default: %(default)s)')
    args = parser.parse_args()

    try:
        with open(args.config, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config file: {e}")
        return 1

    if isinstance(config_data, list):
        channels = config_data
    elif isinstance(config_data, dict) and 'channels' in config_data:
        channels = config_data['channels']
    else:
        logger.error("Invalid config format. Expected a list of channels or a dict with 'channels' key.")
        return 1


    for ch in channels:
        if 'id' not in ch or 'url' not in ch:
            logger.error(f"Channel missing 'id' or 'url': {ch}")
            return 1


    try:
        build_epg(channels, args.xml_out, args.json_out, args.debug_dir)
    except Exception as e:
        logger.error(f"EPG building failed: {e}", exc_info=True)
        return 1


    if args.html_out:
        try:
            generate_html(args.xml_out, args.html_out)
        except Exception as e:
            logger.error(f"HTML generation failed: {e}")
            return 1

    return 0


if __name__ == "__main__":
    exit(main())
