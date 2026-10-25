import Gio  from 'gi://Gio';

import {
    SCENES_CONFIG_PATH,
    ROOMS_CONFIG_PATH,
    DEVICES_CONFIG_PATH,
    HOUSE_CONFIG_PATH,
} from './constants.js';
import { resolvePath, xyToHex } from './utils.js';

export function loadScenes() {
    const names = [], colors = {}, dark = {};
    try {
        const file = Gio.File.new_for_path(resolvePath(SCENES_CONFIG_PATH));
        if (!file.query_exists(null)) {
            logError(new Error(`not found: ${resolvePath(SCENES_CONFIG_PATH)}`),
                     'Zigduck: scenes.json');
            return { names, colors, dark };
        }
        const [, bytes] = file.load_contents(null);
        const data   = JSON.parse(new TextDecoder().decode(bytes));
        const scenes = (data && data.scenes) || {};
        for (const [name, scene] of Object.entries(scenes)) {
            names.push(name);
            let onCount = 0, offCount = 0;
            const list = [], seen = new Set();
            for (const cfg of Object.values(scene || {})) {
                const state = String((cfg && cfg.state) || '').toUpperCase();
                if (state === 'ON')       onCount++;
                else if (state === 'OFF') offCount++;
                if (state !== 'ON') continue;
                const c = cfg && cfg.color;
                if (!c) continue;
                let hex = null;
                if (typeof c.hex === 'string') hex = c.hex;
                else if (Array.isArray(c.xy) && c.xy.length === 2)
                    hex = xyToHex(c.xy[0], c.xy[1]);
                if (!hex) continue;
                const k = hex.toUpperCase();
                if (!seen.has(k)) { seen.add(k); list.push(hex); }
            }
            colors[name] = list;
            dark[name]   = offCount > onCount;
        }
    } catch (e) {
        logError(e, 'Zigduck: could not parse scenes.json');
    }
    return { names, colors, dark };
}

export function loadRoomMeta() {
    const meta = {};
    try {
        const file = Gio.File.new_for_path(resolvePath(ROOMS_CONFIG_PATH));
        if (!file.query_exists(null)) return meta;
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        for (const [name, room] of Object.entries(data || {})) {
            meta[name] = {
                icon: room && typeof room.icon === 'string' ? room.icon : null,
                entertainment: !!(room && room.entertainment),
            };
        }
    } catch (e) {
        logError(e, 'Zigduck: could not read rooms.json');
    }
    return meta;
}

export function loadDeviceMeta() {
    const meta = {};
    try {
        const file = Gio.File.new_for_path(resolvePath(DEVICES_CONFIG_PATH));
        if (!file.query_exists(null)) return meta;
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        for (const [name, info] of Object.entries(data || {})) {
            meta[name] = {
                ieee:         info.ieee         ?? null,
                hue_id:       info.hue_id       ?? null,
                endpoint:     info.endpoint     ?? null,
                battery_type: info.battery_type ?? null,
            };
        }
    } catch (e) {
        logError(e, 'Zigduck: could not read devices.json');
    }
    return meta;
}

export function loadBaseTopic() {
    try {
        const file = Gio.File.new_for_path(resolvePath(HOUSE_CONFIG_PATH));
        if (!file.query_exists(null)) return 'zigduck';
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        const t = data?.mosquitto?.base_topic;
        return (typeof t === 'string' && t) ? t : 'zigduck';
    } catch (_) { return 'zigduck'; }
}

export function loadHouseDevices() {
    const out = [];
    try {
        const file = Gio.File.new_for_path(resolvePath(HOUSE_CONFIG_PATH));
        if (!file.query_exists(null)) return out;
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        const devices = (data && data.devices) || {};
        for (const [name, dev] of Object.entries(devices)) {
            if (!dev || dev.enable === false) continue;
            const hasControls = dev.controls && Object.keys(dev.controls).length > 0;
            out.push({
                id:            `house:${name}`,
                hostKey:       name,
                friendly_name: name,
                type:          dev.type || 'host',
                room:          dev.room || 'other',
                icon:          dev.icon || null,
                ip:            dev.ip || null,
                controls:      dev.controls || {},
                stateEndpoint: dev.state.endpoint || (hasControls ? '/api/sensors' : null),
            });
        }
    } catch (e) { logError(e, 'Zigduck: could not read config.json devices'); }
    return out;
}

export function loadTvs() {
    const tvs = [];
    try {
        const file = Gio.File.new_for_path('/etc/zigduck/tv-defaults.json');
        if (!file.query_exists(null)) return tvs;
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        for (const [name, tv] of Object.entries(data.tvs || {})) {
            tvs.push({
                id:            `tv:${name}`,
                tvKey:         name,
                friendly_name: name,
                type:          'tv',
                room:          tv.room || 'other',
                ip:            tv.ip,
                is_default:    !!tv.is_default,
                apps:          tv.apps || {},
                keymap:        tv.keymap || {},
                channels:      tv.channels || {},
                icon:          'mdi:television',
            });
        }
    } catch (e) {
        logError(e, 'Zigduck: could not read tv-defaults.json');
    }
    return tvs;
}

export function loadTvIcons() {
    const icons = {};
    try {
        const file = Gio.File.new_for_path('/etc/zigduck/tv-defaults.json');
        if (!file.query_exists(null)) return icons;
        const [, bytes] = file.load_contents(null);
        const data = JSON.parse(new TextDecoder().decode(bytes));
        for (const tv of Object.values(data.tvs || {})) {
            for (const [key, ch] of Object.entries(tv.channels || {})) {
                const id = String(ch.id ?? key);
                if (ch.icon) icons[id] = ch.icon;
            }
        }
    } catch (e) {
        logError(e, 'Zigduck: could not read tv-defaults.json');
    }
    return icons;
}
