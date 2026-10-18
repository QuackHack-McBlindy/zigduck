import Gio  from 'gi://Gio';
import GLib from 'gi://GLib';

import { OFFLINE_MS, STALE_MS } from './constants.js';

export function extensionDir() {
    return GLib.path_get_dirname(Gio.File.new_for_uri(import.meta.url).get_path());
}

export function resolvePath(p) {
    if (p.startsWith('/')) return p;
    const local = `${extensionDir()}/${p}`;
    if (Gio.File.new_for_path(local).query_exists(null)) return local;
    const user = GLib.build_filenamev([
        GLib.get_home_dir(), '.local', 'share', 'zigduck', p,
    ]);
    if (Gio.File.new_for_path(user).query_exists(null)) return user;
    const global = `/etc/zigduck/${p}`;
    if (Gio.File.new_for_path(global).query_exists(null)) return global;
    return local;
}

export function slugify(name) {
    return String(name).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseEpgTime(str) {
    if (!str) return null;
    const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(String(str));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

export function fmtHHMM(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

export function hexToRgb01(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [0.5, 0.5, 0.5];
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255,
            ((v >> 8) & 255) / 255,
            ( v        & 255) / 255];
}

export function rgbToHex01(r, g, b) {
    const byte = x => Math.round(Math.max(0, Math.min(1, x)) * 255)
                        .toString(16).padStart(2, '0');
    return '#' + byte(r) + byte(g) + byte(b);
}

export function xyToHex(x, y) {
    if (!(y > 0)) return '#808080';
    const X = x / y, Y = 1.0, Z = (1 - x - y) / y;
    const r =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
    const g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
    const b =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;
    const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    const byte = c => Math.max(0, Math.min(255, Math.round(gam(c) * 255)));
    const hx = n => n.toString(16).padStart(2, '0');
    return '#' + hx(byte(r)) + hx(byte(g)) + hx(byte(b));
}

export function randomHex() {
    const v = Math.floor(Math.random() * 0xFFFFFF);
    return '#' + v.toString(16).padStart(6, '0');
}

export function batteryColor(pct) {
    if (pct >= 70) return '#2ecc71';
    if (pct >= 30) return '#f39c12';
    return '#e74c3c';
}

export function timeAgo(iso) {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return String(iso);
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
}

export function parseTimestamp(iso) {
    if (!iso) return NaN;
    const cleaned = String(iso).replace(/(\.\d{3})\d+/, '$1');
    return Date.parse(cleaned);
}

export function formatNotifyTime(iso) {
    const t = parseTimestamp(iso);
    if (!Number.isFinite(t)) return '--:--';
    const d = new Date(t);
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear()
                 && d.getMonth() === now.getMonth()
                 && d.getDate() === now.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (sameDay) return `${hh}:${mm}`;
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    return `${MM}-${DD} ${hh}:${mm}`;
}

export function isTruthy(v) {
    if (v === true) return true;
    if (v === false || v == null) return false;
    return String(v).toLowerCase() === 'true';
}

export function lastSeenMs(state) {
    if (!state) return 0;
    if (state.last_seen) {
        const t = Date.parse(state.last_seen);
        if (Number.isFinite(t)) return t;
    }
    if (state.last_updated) {
        const ts = parseInt(state.last_updated, 10);
        if (Number.isFinite(ts)) return ts * 1000;
    }
    return 0;
}

export function isOffline(state) {
    if (!state) return false;
    const ms = lastSeenMs(state);
    if (!ms) return false;
    return (Date.now() - ms) > OFFLINE_MS;
}

export function isCardStale(card) {
    if (!card || !card.last_updated) return false;
    const t = Date.parse(card.last_updated);
    if (!Number.isFinite(t)) return false;
    return (Date.now() - t) > STALE_MS;
}

export function deviceSortKey(d, state) {
    if (isOffline(state)) return 1000;
    const t = d.type || '';
    if (t === 'host')                      return -2;
    if (t === 'tv')                        return -1;
    if (t === 'motion')                    return 0;
    if (t === 'sensor')                    return 1;
    if (t === 'dimmer' || t === 'remote')  return 2;
    if (t === 'light' || t === 'hue_light') return 10;
    if (t === 'outlet')                    return 11;
    if (t === 'pusher')                    return 12;
    if (t === 'blind')                     return 13;
    return 20;
}

export function sortDevices(devices, states) {
    return [...devices].sort((a, b) => {
        const ka = deviceSortKey(a, states[a.friendly_name] || {});
        const kb = deviceSortKey(b, states[b.friendly_name] || {});
        if (ka !== kb) return ka - kb;
        return a.friendly_name.localeCompare(b.friendly_name);
    });
}

export function colorFromState(state) {
    if (!state || !state.color) return null;
    let c = state.color;
    if (typeof c === 'string') {
        try { c = JSON.parse(c); } catch (_) { return null; }
    }
    if (!c || typeof c !== 'object') return null;
    if (typeof c.hex === 'string') return c.hex;
    if (Array.isArray(c.xy) && c.xy.length === 2) return xyToHex(c.xy[0], c.xy[1]);
    if (typeof c.x === 'number' && typeof c.y === 'number') return xyToHex(c.x, c.y);
    return null;
}
