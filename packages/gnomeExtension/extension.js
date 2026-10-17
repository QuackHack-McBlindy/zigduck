import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

const SCENE_COLOR_OVERRIDES = {};

const CLI = 'zigduck-cli';
const SCENES_CONFIG_PATH = 'scenes.json';
const ROOMS_CONFIG_PATH  = 'rooms.json';
const DEVICES_CONFIG_PATH = 'devices.json';
const HOUSE_CONFIG_PATH  = 'config.json';

const DEBUG_RED_SCENES = false;

const ONOFF_TYPES  = new Set(['light', 'hue_light', 'outlet', 'pusher']);
const LIGHT_TYPES  = new Set(['light', 'hue_light']);
const OFFLINE_MS   = 2 * 24 * 60 * 60 * 1000;
const STALE_MS     = 24 * 2 * 60 * 60 * 1000;

const FA_EMOJI = {
    'fa-bitcoin':            '₿',
    'fa-monero':             'ɱ',
    'fa-bolt':               '⚡',
    'fa-thermometer-half':   '🌡',
    'fa-calendar':           '📅',
    'fa-chart-line':         '📈',
    'fa-fire':               '🔥',
    'fa-tint':               '💧',
};

function faIcon(faName, size = 16) {
    if (!faName) return plainLabel('▫',
        `width: ${size + 4}px; text-align: center; opacity: 0.7;`);
    const m = /fa-[a-z0-9-]+/.exec(String(faName));
    const key = m ? m[0] : null;
    const emoji = key && FA_EMOJI[key] ? FA_EMOJI[key] : '▫';
    return plainLabel(emoji,
        `width: ${size + 4}px; text-align: center; font-size: ${size - 1}px;`);
}

const MDI_EMOJI = {
    'ceiling-light': '💡', 'lightbulb': '💡', 'weather-night': '🌙',
    'chandelier': '🕯️', 'gesture-tap-button': '🔘', 'water': '💧',
    'motion-sensor': '👁️', 'remote': '📱', 'toggle-switch': '🔘',
    'spotlight': '🔦', 'power-socket-eu': '🔌', 'smoke-detector': '🚨',
    'door': '🚪', 'door-open': '🚪', 'led-strip-variant': '🌈',
    'blinds': '🪟', 'home': '🏠', 'duck': '🦆', 'sofa': '🛋️',
    'stove': '🍳', 'bed': '🛏️', 'television': '📺', 'toilet': '🚽',
    'dots-horizontal': '⋯', 'lamp': '💡', 'floor-lamp': '🛋️',
    'wall-sconce-round': '🔆', 'light-switch': '🔘', 'power': '⏻',
    'music': '🎵', 'movie': '🎬', 'gamepad-variant': '🎮',
    'alarm': '⏰', 'timer': '⏱️', 'desktop-tower': '🖥️',
    'nas':           '🗄️',
    'server':        '🖥️',
    'server-network':'🖥️',
    'laptop':        '💻',
};

const ROOM_EMOJI = {
    livingroom: '🛋️', kitchen: '🍳', bedroom: '🛏️', 'tv-area': '📺',
    hallway: '🚪', wc: '🚽', other: '⋯',
};
const ROOM_ORDER = ['livingroom', 'kitchen', 'bedroom', 'tv-area', 'hallway', 'wc', 'other'];

const GREEN = '#2ecc71';
const RED   = '#e74c3c';
const ROOM_ON_COLOR   = '#ffd166';
const ROOM_SYNC_COLOR = '#8b5cf6';
const SYNC_ACCENT = '#8b5cf6';


function parseEpgTime(str) {
    if (!str) return null;
    const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(String(str));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

function fmtHHMM(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function hexToRgb01(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [0.5, 0.5, 0.5];
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255,
            ((v >> 8) & 255) / 255,
            ( v        & 255) / 255];
}

function rgbToHex01(r, g, b) {
    const byte = x => Math.round(Math.max(0, Math.min(1, x)) * 255)
                        .toString(16).padStart(2, '0');
    return '#' + byte(r) + byte(g) + byte(b);
}

function buildGradientStrip(palette, steps = 24) {
    const strip = new St.BoxLayout({
        x_expand: true, y_expand: true,
    });

    if (!palette || !palette.length) palette = ['#888888'];
    if (palette.length === 1) palette = [palette[0], palette[0]];

    const rgbs = palette.map(hexToRgb01);
    const lastIdx = rgbs.length - 1;

    for (let i = 0; i < steps; i++) {
        const t  = i / (steps - 1);
        const ci = t * lastIdx;
        const i0 = Math.min(Math.floor(ci), lastIdx);
        const i1 = Math.min(i0 + 1, lastIdx);
        const f  = ci - i0;
        const a = rgbs[i0], b = rgbs[i1];
        const hex = rgbToHex01(
            a[0] * (1 - f) + b[0] * f,
            a[1] * (1 - f) + b[1] * f,
            a[2] * (1 - f) + b[2] * f,
        );
        const seg = new St.Widget({
            x_expand: true, y_expand: true,
            style: `background-color: ${hex};`,
        });
        strip.add_child(seg);
    }
    return strip;
}

function xyToHex(x, y) {
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

function slugify(name) {
    return String(name).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extensionDir() {
    return GLib.path_get_dirname(Gio.File.new_for_uri(import.meta.url).get_path());
}

function resolvePath(p) {
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

function plainLabel(text, style = '') {
    const lbl = new St.Label({ text: String(text), style });
    if (lbl.clutter_text) lbl.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    return lbl;
}

function zigduckIcon(size = 16) {
    const svgPath = `${extensionDir()}/icons/zigduck-symbolic.svg`;
    const pngPath = `${extensionDir()}/icons/zigduck-32.png`;
    const svgFile = Gio.File.new_for_path(svgPath);
    if (svgFile.query_exists(null)) {
        return new St.Icon({
            gicon: new Gio.FileIcon({file: svgFile}),
            icon_size: size, y_align: Clutter.ActorAlign.CENTER,
        });
    }
    const pngFile = Gio.File.new_for_path(pngPath);
    if (pngFile.query_exists(null)) {
        return new St.Icon({
            gicon: new Gio.FileIcon({file: pngFile}),
            icon_size: size, y_align: Clutter.ActorAlign.CENTER,
        });
    }
    return new St.Icon({
        icon_name: 'preferences-system-symbolic',
        icon_size: size, y_align: Clutter.ActorAlign.CENTER,
    });
}

function mdiIcon(mdiName, size = 16) {
    const key = mdiName ? String(mdiName).replace(/^mdi:/, '') : null;
    if (key) {
        const path = `${extensionDir()}/icons/mdi/${key}-symbolic.svg`;
        if (Gio.File.new_for_path(path).query_exists(null)) {
            try {
                return new St.Icon({
                    gicon: new Gio.FileIcon({file: Gio.File.new_for_path(path)}),
                    icon_size: size,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: 'color: inherit;',
                });
            } catch (e) { logError(e, `Zigduck: MDI icon load failed for ${key}`); }
        }
    }
    const emoji = key ? (MDI_EMOJI[key] || '•') : '•';
    return plainLabel(emoji,
        `width: ${size + 4}px; text-align: center; font-size: ${size - 1}px;`);
}

function makeColorContent(colors) {
    const width = 400, height = 120;
    if (!colors || !colors.length) colors = ['#888888'];
    if (colors.length === 1)       colors = [colors[0], colors[0]];

    const rgbs = colors.map(hex => {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex);
        if (!m) return [136, 136, 136];
        const v = parseInt(m[1], 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    });
    const lastIdx = rgbs.length - 1;

    const data = new Uint8Array(width * height * 4);
    let off = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const t  = (x / width + y / height) / 2;
            const ci = t * lastIdx;
            const i0 = Math.min(Math.floor(ci), lastIdx);
            const i1 = Math.min(i0 + 1, lastIdx);
            const f  = ci - i0;
            const a = rgbs[i0], b = rgbs[i1];
            data[off]     = Math.round(a[0] * (1 - f) + b[0] * f);
            data[off + 1] = Math.round(a[1] * (1 - f) + b[1] * f);
            data[off + 2] = Math.round(a[2] * (1 - f) + b[2] * f);
            data[off + 3] = 255;
            off += 4;
        }
    }

    const image = new Clutter.Image();
    image.set_data(data, Clutter.PixelFormat.RGBA_8888, width, height, width * 4);
    image._pixels = data;
    return image;
}

function batteryColor(pct) {
    if (pct >= 70) return GREEN;
    if (pct >= 30) return '#f39c12';
    return RED;
}

function timeAgo(iso) {
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

function parseTimestamp(iso) {
    if (!iso) return NaN;
    const cleaned = String(iso).replace(/(\.\d{3})\d+/, '$1');
    return Date.parse(cleaned);
}

function formatNotifyTime(iso) {
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

function isTruthy(v) {
    if (v === true) return true;
    if (v === false || v == null) return false;
    return String(v).toLowerCase() === 'true';
}

function lastSeenMs(state) {
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

function isOffline(state) {
    if (!state) return false;
    const ms = lastSeenMs(state);
    if (!ms) return false;
    return (Date.now() - ms) > OFFLINE_MS;
}

function isCardStale(card) {
    if (!card || !card.last_updated) return false;
    const t = Date.parse(card.last_updated);
    if (!Number.isFinite(t)) return false;
    return (Date.now() - t) > STALE_MS;
}

function cleanCliOutput(text) {
    if (!text) return '(no reply)';
    let s = String(text);

    try {
        const j = JSON.parse(s);
        if (j && typeof j.output === 'string') s = j.output;
    } catch (_) {
        const m = /"output"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/.exec(s);
        if (m) s = m[1];
    }

    s = s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

    s = s.replace(/\\n/g, '\n')
         .replace(/\\t/g, '\t')
         .replace(/\\r/g, '')
         .replace(/\\"/g, '"');

    const noise = [
        /^\s*\[🦆📜\]/,
        /Loading fuzzy index from:/i,
        /^Compiling\s+/i,
        /^Finished\s+.*profile/i,
        /^\s*$/,
    ];
    s = s.split('\n')
         .filter(l => !noise.slice(0, 4).some(re => re.test(l)))
         .join('\n');

    s = s.replace(/\n{3,}/g, '\n\n');

    return s.trim() || '(no reply)';
}

function parseYoBlock(text) {
    if (!text) return { cleaned: text, command: null, ms: null };

    const lines = String(text).split('\n');
    let command = null;
    const args = [];
    let ms = null;
    const out = [];
    let inBlock = false;

    for (const line of lines) {
        if (/^\s*\[🦆📜\]/.test(line)) continue;

        if (/^\s*┌─\(yo-[^)]+\)/.test(line)) {
            inBlock = true;
            continue;
        }

        if (inBlock) {
            if (/^\s*[│└]/.test(line)) {
                const cmdM = /^\s*│\s*🦆\s*quack!\s*(.+?)\s*$/.exec(line);
                if (cmdM) { command = cmdM[1]; continue; }

                const argM = /^\s*└─⮞\s*(.+?)\s*$/.exec(line);
                if (argM) { args.push(argM[1]); continue; }

                if (/^\s*└─\s*🦆\s*says\s*⮞/.test(line)) continue;

                const timeM = /do took\s+([\d.]+)\s*ms/i.exec(line);
                if (timeM) { ms = parseFloat(timeM[1]); continue; }

                continue;
            }
            inBlock = false;
        }

        out.push(line);
    }

    let fullCommand = null;
    if (command !== null || args.length) {
        const parts = [];
        if (command) parts.push(command);
        for (const a of args) parts.push(a);
        fullCommand = parts.join(' ');
    }

    return {
        cleaned: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        command: fullCommand,
        ms,
    };
}

function colorFromState(state) {
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

function randomHex() {
    const v = Math.floor(Math.random() * 0xFFFFFF);
    return '#' + v.toString(16).padStart(6, '0');
}

function deviceSortKey(d, state) {
    if (isOffline(state)) return 1000;
    const t = d.type || '';
    if (t === 'host')                      return -2;
    if (t === 'tv')                          return -1;
    if (t === 'motion')                      return 0;
    if (t === 'sensor')                      return 1;
    if (t === 'dimmer' || t === 'remote')    return 2;
    if (t === 'light' || t === 'hue_light')  return 10;
    if (t === 'outlet')                      return 11;
    if (t === 'pusher')                      return 12;
    if (t === 'blind')                       return 13;
    return 20;
}

function sortDevices(devices, states) {
    return [...devices].sort((a, b) => {
        const ka = deviceSortKey(a, states[a.friendly_name] || {});
        const kb = deviceSortKey(b, states[b.friendly_name] || {});
        if (ka !== kb) return ka - kb;
        return a.friendly_name.localeCompare(b.friendly_name);
    });
}

function runCli(args, timeoutSec = 20) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = Gio.Subprocess.new(
                [CLI, ...args],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            );
        } catch (e) {
            reject(new Error(`Cannot launch ${CLI}`));
            return;
        }
        let active = true;
        const tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeoutSec, () => {
            active = false;
            try { proc.force_exit(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
        });
        proc.communicate_utf8_async(null, null, (p, res) => {
            if (active) { GLib.source_remove(tid); active = false; }
            try {
                const [, stdout, stderr] = p.communicate_utf8_finish(res);
                if (!p.get_successful()) {
                    const errFull = (stderr || '').trim();
                    const last    = errFull.split('\n').filter(Boolean).pop() || '';
                    const code    = p.get_exit_status();
                    const err = new Error(last || `exit ${code}`);
                    err.stderrFull = errFull;
                    err.exitCode   = code;
                    reject(err);
                    return;
                }
                resolve(stdout || '');
            } catch (e) { reject(e); }
        });
    });
}

function runCmd(fullArgs, timeoutSec = 20) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = Gio.Subprocess.new(
                fullArgs,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            );
        } catch (e) {
            reject(new Error(`Cannot launch ${fullArgs[0]}`));
            return;
        }
        let active = true;
        const tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeoutSec, () => {
            active = false;
            try { proc.force_exit(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
        });
        proc.communicate_utf8_async(null, null, (p, res) => {
            if (active) { GLib.source_remove(tid); active = false; }
            try {
                const [, stdout, stderr] = p.communicate_utf8_finish(res);
                if (!p.get_successful()) {
                    const errFull = (stderr || '').trim();
                    const last    = errFull.split('\n').filter(Boolean).pop() || '';
                    const code    = p.get_exit_status();
                    const err = new Error(last || `exit ${code}`);
                    err.stderrFull = errFull;
                    err.exitCode   = code;
                    reject(err);
                    return;
                }
                resolve(stdout || '');
            } catch (e) { reject(e); }
        });
    });
}

const ZigduckIndicator = GObject.registerClass(
class ZigduckIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Zigduck'));

        this._alive         = true;
        this._buttonsOpenRooms = {};
        this._devices       = [];
        this._states        = {};
        this._notifications = [];
        this._scenes        = [];
        this._sceneColors   = {};
        this._sceneDark     = {};
        this._roomMeta      = {};
        this._deviceMeta    = {};
        this._deviceMetaLoaded = false;
        this._rooms         = [];
        this._selectedRoom  = null;
        this._detailDevice  = null;
        this._settingsView  = false;
        this._notifyView    = false;
        this._alarmsView    = false;
        this._alarms        = [];
        this._timers        = [];
        this._cardsOpen     = false;
        this._searchQuery   = '';
        this._roomButtons   = new Map();
        this._busy          = new Set();
        this._pingResults   = {};
        this._pingHideTimer = 0;
        this._sliderDebounce = 0;
        this._detailDebounce = 0;
        this._tvView         = false;
        this._tvData         = null;
        this._tvIcons        = null;
        this._tvIconsLoaded  = false;
        this._tvState        = {};
        this._cards        = [];
        this._detailCard   = null;
        this._sceneDraft   = null;
        this._chatMessages = [];
        this._chatActive   = false;

        this._syncByRoom = {};
        this._syncStatus = null;
        this._baseTopic  = 'zigduck';

        this.add_child(this._buildPanelIcon());

        const root = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
        const content = new St.BoxLayout({
            vertical: true, x_expand: true,
            style: 'min-width: 400px; max-width: 400px; spacing: 8px; padding: 6px;',
        });
        root.add_child(content);
        this.menu.addMenuItem(root);

        const header = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });

        this._bellBtn = new St.Button({ can_focus: true, style_class: 'zigduck-icon-btn' });
        this._bellBtn.set_child(this._buildBellWithBadge(0));
        this._bellBtn.connect('clicked', () => {
            this._notifyView   = true;
            this._settingsView = false;
            this._alarmsView   = false;
            this._detailDevice = null;
            this._detailCard   = null;
            this._sceneDraft   = null;
            this._updateToolbarState();
            this._renderContent();
        });
        header.add_child(this._bellBtn);

        this._gearBtn = new St.Button({ can_focus: true, style_class: 'zigduck-icon-btn' });
        this._gearBtn.set_child(zigduckIcon(14));
        this._gearBtn.connect('clicked', () => {
            this._settingsView = !this._settingsView;
            this._notifyView   = false;
            this._alarmsView   = false;
            this._detailDevice = null;
            this._detailCard   = null;
            this._sceneDraft   = null;
            this._updateToolbarState();
            this._renderContent();
        });
        header.add_child(this._gearBtn);

        header.add_child(plainLabel('Zigduck', 'font-weight: bold;'));
        header.add_child(new St.Widget({ x_expand: true }));
        this._status = plainLabel('…', 'font-size: 0.85em; opacity: 0.75;');
        header.add_child(this._status);
        const rb = new St.Button({ label: '↻', can_focus: true });
        rb.connect('clicked', () => this._refresh());
        header.add_child(rb);
        content.add_child(header);

        this._roomsRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 6px; padding: 2px 0;',
        });
        content.add_child(this._roomsRow);

        content.add_child(this._buildSliderRow());

        this._entry = new St.Entry({
            hint_text: 'Search devices / chat with devices…',
            x_expand: true, can_focus: true,
            style: 'padding: 4px 8px;',
        });

        this._entry.clutter_text.connect('text-changed', () => {
            this._searchQuery = this._entry.get_text().toLowerCase();
            this._schedulePreview();
            this._renderContent();
        });

        this._entry.clutter_text.connect('activate', () => this._onSearchSubmit());
        content.add_child(this._entry);

        this._previewCmd   = null;
        this._previewTimer = 0;
        this._previewLabel = plainLabel('',
            'font-size: 0.85em; opacity: 0.85; padding: 2px 8px 6px 8px; '
          + 'font-family: monospace; color: #9ecbff;');
        this._previewLabel.visible = false;
        this._previewLabel.x_expand = true;

        if (this._previewLabel.clutter_text) {
            this._previewLabel.clutter_text.line_wrap = true;
            this._previewLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        }
        content.add_child(this._previewLabel);

        content.add_child(new St.Widget({
            style: 'height: 1px; background: rgba(255,255,255,0.12); margin: 2px 0;',
        }));

        this._contentBox = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 4px;',
        });
        content.add_child(this._contentBox);
        this._contentBox.add_child(plainLabel('Open again to load…',
            'opacity: 0.6; padding: 8px;'));

        this.menu.connect('open-state-changed', (_menu, open) => {
            if (open) {
                this._detailDevice = null;
                this._detailCard   = null;
                this._sceneDraft   = null;
                this._settingsView = false;
                this._notifyView   = false;
                this._alarmsView   = false;
                this._updateToolbarState();
                this._refresh();
            }
        });
    }

    _buildBellWithBadge(count) {
        const wrap = new St.Widget({ layout_manager: new Clutter.BinLayout() });
        wrap.add_child(new St.Icon({
            icon_name: 'preferences-system-notifications-symbolic',
            icon_size: 14,
        }));
        if (count > 0) {
            const badge = plainLabel(String(count),
                'background-color: #e74c3c; color: white; '
              + 'font-size: 0.6em; font-weight: bold; '
              + 'border-radius: 7px; padding: 0 4px; min-width: 9px; '
              + 'text-align: center;');
            badge.x_align = Clutter.ActorAlign.END;
            badge.y_align = Clutter.ActorAlign.START;
            wrap.add_child(badge);
        }
        return wrap;
    }

    _updateBellBadge(count) {
        if (!this._bellBtn) return;
        this._bellBtn.set_child(this._buildBellWithBadge(count));
    }

    _updateToolbarState() {
        if (this._gearBtn) {
            this._gearBtn.style_class = 'zigduck-icon-btn'
                + (this._settingsView ? ' zigduck-icon-btn-active' : '');
        }
        if (this._bellBtn) {
            this._bellBtn.style_class = 'zigduck-icon-btn'
                + (this._notifyView ? ' zigduck-icon-btn-active' : '');
        }
    }

    _buildSliderRow() {
        const row = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 2px 0;',
        });
        row.add_child(new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
        }));
        this._slider = new Slider.Slider(1.0);
        this._slider.x_expand = true;
        this._slider.y_align = Clutter.ActorAlign.CENTER;
        this._slider.connect('notify::value', () => this._onSliderChanged());
        row.add_child(this._slider);
        this._brightnessPct = plainLabel('100%',
            'width: 44px; text-align: right; font-size: 0.85em;');
        row.add_child(this._brightnessPct);
        return row;
    }

    _getSync(room) {
        if (!this._syncByRoom[room]) {
            this._syncByRoom[room] = { on: false, mode: null, intensity: null, open: false };
        }
        return this._syncByRoom[room];
    }

    _roomSyncOn(room) {
        return !!(this._syncByRoom[room] && this._syncByRoom[room].on);
    }

    async _loadSyncStatus() {
        try {
            const out = await runCli(['hue', 'sync', 'status'], 10);
            const parsed = JSON.parse(out);
            this._syncStatus = (parsed && typeof parsed === 'object') ? parsed : null;
        } catch (e) {
            this._syncStatus = null;
        }
    }

    _syncIsOn() {
        return !!(this._syncStatus && this._syncStatus.syncActive);
    }

    _syncLiveMode() {
        const m = (this._syncStatus && this._syncStatus.mode) || 'video';
        return ['video', 'music', 'game'].includes(m) ? m : 'video';
    }

    _syncUiModeToCli(uiMode) {
        return uiMode === 'movie'  ? 'video'
             : uiMode === 'gaming' ? 'game'
             : 'music';
    }

    _syncCliModeToUi(cliMode) {
        return cliMode === 'video' ? 'movie'
             : cliMode === 'game'  ? 'gaming'
             : 'music';
    }

    _syncLiveIntensityUi() {
        const mode = this._syncLiveMode();
        const level = this._syncStatus?.[mode]?.intensity || null;
        return level === 'subtle'   ? 'low'
             : level === 'moderate' ? 'medium'
             : level === 'intense'  ? 'extreme'
             : level === 'high'     ? 'high'
             : null;
    }

    _syncUiIntensityToCli(uiLevel) {
        return { low: 'subtle', medium: 'moderate',
                 high: 'high', extreme: 'intense' }[uiLevel];
    }

    async _syncOn() {
        this._status.set_text('… sync on');
        try {
            await runCli(['hue', 'sync', 'on'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● sync on');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncOff() {
        this._status.set_text('… sync off');
        try {
            await runCli(['hue', 'sync', 'off'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● sync off');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncToggle() {
        this._status.set_text('… sync toggle');
        try {
            await runCli(['hue', 'sync', 'toggle'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● synced');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetModeUi(uiMode) {
        const cliMode = this._syncUiModeToCli(uiMode);
        this._status.set_text(`… sync mode ${cliMode}`);
        try {
            await runCli(['hue', 'sync', 'mode', cliMode], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● mode ${cliMode}`);
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetIntensityUi(uiLevel) {
        const cliLevel = this._syncUiIntensityToCli(uiLevel);
        if (!cliLevel) return;
        this._status.set_text(`… sync intensity ${cliLevel}`);
        try {
            await runCli(['hue', 'sync', 'intensity', cliLevel], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● intensity ${cliLevel}`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetBrightness(pct) {
        this._status.set_text(`… sync brightness ${pct}%`);
        try {
            await runCli(['hue', 'sync', 'brightness', String(pct)], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● sync ${pct}%`);
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetHdmiInput(n) {
        this._status.set_text(`… sync hdmi input${n}`);
        try {
            await runCli(['hue', 'sync', 'hdmi-input', String(n)], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● hdmi input${n}`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }


    _renderRooms() {
        this._roomsRow.destroy_all_children();
        this._roomButtons.clear();

        for (const room of this._rooms) {
            const iconName = this._roomIconFor(room);
            const btn = new St.Button({
                can_focus: true, style_class: 'zigduck-room-circle',
            });
            const child = iconName ? mdiIcon(iconName, 20)
                : plainLabel(ROOM_EMOJI[room] || '🏠', 'text-align: center;');
            child.x_expand = true; child.y_expand = true;
            const baseStyle = (typeof child.get_style === 'function' ? child.get_style() : '') || '';
            btn.set_child(child);
            btn.connect('clicked', () => {
                this._selectedRoom = (this._selectedRoom === room) ? null : room;
                this._detailDevice = null;
                this._detailCard   = null;
                this._sceneDraft   = null;
                this._chatActive   = false;
                this._chatMessages = [];
                this._settingsView = false;
                this._notifyView   = false;
                this._alarmsView   = false;
                this._updateToolbarState();
                this._updateRoomSelection();
                this._renderContent();
            });
            this._roomsRow.add_child(btn);
            this._roomButtons.set(room, { btn, child, baseStyle });
        }
        this._updateRoomSelection();
    }

    _roomHasLightOn(room) {
        for (const d of this._devices) {
            if ((d.room || 'other') !== room) continue;
            if (!LIGHT_TYPES.has(d.type)) continue;
            const st = this._states[d.friendly_name] || {};
            if (st.state === 'ON' && !isOffline(st)) return true;
        }
        return false;
    }

    _updateRoomSelection() {
        for (const [room, entry] of this._roomButtons) {
            const { btn, child, baseStyle } = entry;
            const sel      = room === this._selectedRoom;
            const syncOn   = this._syncIsOn() && this._roomIsEntertainment(room);
            const lightOn  = this._roomHasLightOn(room);

            btn.style_class = 'zigduck-room-circle'
                + (sel ? ' zigduck-room-circle-selected' : '');

            if (syncOn && !sel) {
                btn.set_style(
                    `border: 3px solid ${ROOM_SYNC_COLOR}; ` +
                    `background-color: rgba(139, 92, 246, 0.45);`
                );
            } else {
                btn.set_style(null);
            }

            if (child && typeof child.set_style === 'function') {
                let tint = '';
                if (syncOn)         tint = ROOM_SYNC_COLOR;
                else if (lightOn)   tint = ROOM_ON_COLOR;
                if (tint && !sel) child.set_style(baseStyle + ` color: ${tint};`);
                else              child.set_style(baseStyle);
            }
        }
    }

    _togglePill(isOn, labelText, onClick, accentColor = null, muteGlow = false, glow = false) {
        const showGlow = isOn && !muteGlow;
        const b = new St.Button({
            can_focus: true,
            style_class: 'zigduck-pill' + (showGlow ? ' zigduck-pill-on' : ''),
        });
        if (showGlow && accentColor) {
            let style = `background-color: ${accentColor}; `
                      + `border: 1px solid ${accentColor}; `;
            if (glow) {
                style += `box-shadow: 0 0 10px ${accentColor}, `
                       + `0 0 3px ${accentColor}; `;
            }
            b.set_style(style);
        }
        const box = new St.BoxLayout({ style: 'spacing: 5px;' });
        box.add_child(plainLabel(isOn ? '●' : '○',
            showGlow && accentColor
                ? 'color: rgba(0,0,0,0.75);'
                : (showGlow ? 'color: #9ecbff;' : 'color: rgba(255,255,255,0.6);')));
        box.add_child(plainLabel(labelText,
            showGlow && accentColor ? 'color: #000; font-weight: bold;' : ''));
        b.set_child(box);
        b.connect('clicked', onClick);
        return b;
    }


    _onSliderChanged() {
        const pct = Math.round(this._slider.value * 100);
        this._brightnessPct.set_text(`${pct}%`);
        if (this._sliderDebounce) GLib.source_remove(this._sliderDebounce);
        this._sliderDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._sliderDebounce = 0;
            this._applyBrightness(pct);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _applyBrightness(pct) {
        const args = this._selectedRoom
            ? ['--room', this._selectedRoom, '--brightness', String(pct)]
            : ['--all-lights', 'true', '--brightness', String(pct)];
        this._status.set_text(`… ${pct}%`);
        try {
            await runCli(args);
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    _generateSceneDraft() {
        const lights = this._devices.filter(d =>
            LIGHT_TYPES.has(d.type) &&
            (this._states[d.friendly_name] || {}).state === 'ON'
        );

        if (!lights.length) {
            return '/* No lights are currently ON. */';
        }

        const nixStr = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        lights.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));

        const lines = ['"New Scene" = {'];
        for (const d of lights) {
            const st = this._states[d.friendly_name] || {};
            const parts = ['state = "ON"'];

            const bri = parseInt(st.brightness, 10);
            if (Number.isFinite(bri) && bri > 0) {
                parts.push(`brightness = ${bri}`);
            }

            let c = st.color;
            if (typeof c === 'string') {
                try { c = JSON.parse(c); } catch (_) { c = null; }
            }
            if (c && typeof c === 'object') {
                if (typeof c.hex === 'string' && c.hex) {
                    parts.push(`color = { hex = "${c.hex}"; }`);
                } else if (Array.isArray(c.xy) && c.xy.length === 2) {
                    parts.push(`color = { xy = [ ${c.xy[0]} ${c.xy[1]} ]; }`);
                } else if (typeof c.x === 'number' && typeof c.y === 'number') {
                    parts.push(`color = { xy = [ ${c.x} ${c.y} ]; }`);
                }
            }

            lines.push(`    "${nixStr(d.friendly_name)}" = { ${parts.join('; ')}; };`);
        }
        lines.push('};');
        return lines.join('\n');
    }

    _loadScenes() {
        const names = [], colors = {}, dark = {};
        try {
            const file = Gio.File.new_for_path(resolvePath(SCENES_CONFIG_PATH));
            if (!file.query_exists(null)) {
                logError(new Error(`not found: ${resolvePath(SCENES_CONFIG_PATH)}`),
                         'Zigduck: scenes.json');
                return {names, colors, dark};
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
        return {names, colors, dark};
    }


    _reloadSceneStylesheet() {
        try {
            const rules = [];

            for (const name of (this._scenes || [])) {
                const slug     = slugify(name);
                const isDark   = this._sceneDark?.[name] || false;
                const colors   = this._sceneColors?.[name] || [];
                const override = SCENE_COLOR_OVERRIDES?.[name] || null;

                let palette = colors;
                if (override)             palette = [override];
                else if (isDark)          palette = ['#000000'];
                else if (!colors.length)  palette = ['#ffffff'];

                const textColor = isDark ? '#ffffff' : '#000000';

                const svgPath = `${GLib.get_tmp_dir()}/zigduck-scene-${slug}.svg`;
                GLib.file_set_contents(svgPath, this._buildGradientSvg(palette));

                rules.push(
                    `.zigduck-scene-${slug} {\n` +
                    `  background-image: url('file://${svgPath}');\n` +
                    `  background-size: 100% 100%;\n` +
                    `  background-color: ${palette[0]};\n` +
                    `  color: ${textColor};\n` +
                    `}\n`
                );
            }

            const css  = rules.join('\n');
            const path = GLib.build_filenamev([GLib.get_tmp_dir(), 'zigduck-scenes.css']);
            GLib.file_set_contents(path, css);

            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            if (this._scenesStylesheet) {
                try { theme.unload_stylesheet(this._scenesStylesheet); } catch (_) {}
            }
            const file = Gio.File.new_for_path(path);
            theme.load_stylesheet(file);
            this._scenesStylesheet = file;
        } catch (e) {
            logError(e, 'Zigduck: failed to load scene stylesheet');
        }
    }

    _buildGradientSvg(colors) {
        const stops = colors.map((c, i) => {
            const offset = (i / Math.max(colors.length - 1, 1)) * 100;
            return `<stop offset="${offset}%" stop-color="${c}"/>`;
        }).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"
         viewBox="0 0 200 60" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          ${stops}
        </linearGradient>
      </defs>
      <rect width="200" height="60" fill="url(#g)"/>
    </svg>`;
    }

    _unloadSceneStylesheet() {
        if (!this._scenesStylesheet) return;
        try {
            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            theme.unload_stylesheet(this._scenesStylesheet);
        } catch (_) {}
        this._scenesStylesheet = null;
    }

    _loadRoomMeta() {
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

    _loadDeviceMeta() {
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

    _roomIconFor(roomName) {
        const meta = this._roomMeta;
        if (!meta) return null;
        if (meta[roomName] && meta[roomName].icon) return meta[roomName].icon;
        const lower = roomName.toLowerCase();
        if (meta[lower] && meta[lower].icon) return meta[lower].icon;
        const slug = slugify(roomName);
        for (const [k, v] of Object.entries(meta)) {
            if (slugify(k) === slug && v.icon) return v.icon;
        }
        return null;
    }

    _roomIsEntertainment(roomName) {
        const meta = this._roomMeta;
        if (!meta || !roomName) return false;
        if (meta[roomName] && meta[roomName].entertainment) return true;
        const lower = roomName.toLowerCase();
        if (meta[lower] && meta[lower].entertainment) return true;
        const slug = slugify(roomName);
        for (const [k, v] of Object.entries(meta)) {
            if (slugify(k) === slug && v.entertainment) return true;
        }
        return false;
    }

    async _loadStates() {
        try {
            const out = await runCli(['--state-json'], 30);
            const obj = JSON.parse(out);
            if (obj && typeof obj === 'object') return obj;
        } catch (e) {
            logError(e, 'Zigduck: --state-json failed');
        }
        return {};
    }

    async _loadNotifications() {
        try {
            const out = await runCli(['--get-notify'], 15);
            const arr = JSON.parse(out);
            if (Array.isArray(arr)) {
                if (arr.length > this._notifications.length) {
                    const player = global.display.get_sound_player();
                    player.play_from_theme('bell', 'Zigduck notification', null);
                }
                return arr;
            }
        } catch (e) {
            logError(e, 'Zigduck: --get-notify failed');
        }
        return [];
    }

    async _refresh() {
        if (!this._alive) return;
        this._status.set_text('…');
        try {
            const [devOut, states, notifArr, cardsOut] = await Promise.all([
                runCli(['--list', 'devices', '--json-output']),
                this._loadStates(),
                this._loadNotifications(),
                runCli(['--cards'], 20).catch(() => '[]'),
                this._loadSyncStatus(),
            ]);
            const devices = JSON.parse(devOut);
            if (!Array.isArray(devices)) throw new Error('unexpected device output');
            this._devices = [
                ...this._loadHouseDevices(),
                ...devices,
                ...this._loadTvs(),
            ];

            this._states  = states;
            this._notifications = Array.isArray(notifArr) ? notifArr : [];
            this._updateBellBadge(this._notifications.length);

            try {
                const cards = JSON.parse(cardsOut);
                this._cards = Array.isArray(cards) ? cards : [];
            } catch (_) { this._cards = []; }

            const scene = this._loadScenes();
            this._scenes      = scene.names;
            this._sceneColors = scene.colors;
            this._sceneDark   = scene.dark;
            this._roomMeta    = this._loadRoomMeta();
            this._baseTopic   = this._loadBaseTopic();

            this._reloadSceneStylesheet();

            if (!this._deviceMetaLoaded) {
                this._deviceMeta = this._loadDeviceMeta();
                this._deviceMetaLoaded = true;
            }

            const roomSet = new Set(this._devices.map(d => d.room || 'other'));
            const ordered = [...roomSet].sort((a, b) => {
                const ia = ROOM_ORDER.indexOf(a), ib = ROOM_ORDER.indexOf(b);
                if (ia === -1 && ib === -1) return a.localeCompare(b);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
            const roomsChanged =
                ordered.length !== this._rooms.length ||
                ordered.some((r, i) => r !== this._rooms[i]);
            this._rooms = ordered;

            if (roomsChanged) this._renderRooms();
            else this._updateRoomSelection();

            if (this._selectedRoom && !this._rooms.includes(this._selectedRoom)) {
                this._selectedRoom = null;
                this._updateRoomSelection();
            }

            this._status.set_text(
                `● ${devices.length} devices · ${Object.keys(states).length} states`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || 'error').slice(0, 45));
            logError(e, 'Zigduck refresh');
        }
    }

    _schedulePreview() {
        if (this._previewTimer) {
            GLib.source_remove(this._previewTimer);
            this._previewTimer = 0;
        }

        const q = this._searchQuery.trim();

        if (!q) {
            this._previewCmd = null;
            this._updatePreviewUI();
            return;
        }

        const hasMatches = this._devices.some(d =>
            d.friendly_name.toLowerCase().includes(q));
        if (hasMatches) {
            this._previewCmd = null;
            this._updatePreviewUI();
            return;
        }

        const text = this._entry.get_text().trim();
        this._previewTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this._previewTimer = 0;
            this._fetchPreview(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _fetchPreview(text) {
        if (this._entry.get_text().trim() !== text) return;
        try {
            const out = await runCmd(
                ['env', 'YO_PREVIEW=1', 'yo', 'do', text], 15);

            const lines = (out || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('yo '))
                .slice(0, 5);

            this._previewCmd = lines.length
                ? lines.map(l => l.slice(0, 400))
                : null;
        } catch (e) {
            this._previewCmd = null;
        }
        if (this._entry.get_text().trim() !== text) return;
        this._updatePreviewUI();
    }

    _updatePreviewUI() {
        if (!this._previewLabel) return;
        const list = this._previewCmd;
        if (list && list.length) {
            this._previewLabel.set_text(list.map(l => `→ ${l}`).join('\n'));
            this._previewLabel.visible = true;
        } else {
            this._previewLabel.set_text('');
            this._previewLabel.visible = false;
        }
    }

    async _onSearchSubmit() {
        const text = this._entry.get_text().trim();
        if (!text) return;

        this._entry.set_text('');

        let command = null;
        if (this._previewCmd && this._previewCmd.length) {
            command = this._previewCmd.join('  &&  ');
        } else {
            try {
                const out = await runCmd(
                    ['env', 'YO_PREVIEW=1', 'yo', 'do', text], 15);
                const lines = (out || '')
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => l.startsWith('yo '))
                    .slice(0, 5);
                if (lines.length) command = lines.join('  &&  ');
            } catch (_) { }
        }
        this._previewCmd = null;
        this._updatePreviewUI();

        this._chatActive   = true;
        this._detailCard   = null;
        this._detailDevice = null;
        this._sceneDraft   = null;
        this._settingsView = false;
        this._notifyView   = false;
        this._alarmsView   = false;
        this._tvView       = false;
        this._updateToolbarState();

        this._chatMessages.push({ role: 'user', text });
        this._renderContent();

        this._status.set_text(`… yo do "${text}"`);
        try {
            const out = await runCmd(['yo', 'do', text], 30);
            const cleaned = cleanCliOutput(out);
            const parsed  = parseYoBlock(cleaned);
            this._chatMessages.push({
                role:    'bot',
                text:    parsed.cleaned || 'Done!',
                command: command,
                ms:      parsed.ms,
            });
            this._status.set_text('● reply received');
        } catch (e) {
            logError(e, 'Zigduck: yo do failed');
            const full    = (e && e.stderrFull) || (e && e.message) || 'command failed';
            const cleaned = cleanCliOutput(full);
            const parsed  = parseYoBlock(cleaned);
            this._chatMessages.push({
                role:    'bot',
                text:    `⚠️ ${parsed.cleaned || full}`,
                command: command,
                ms:      parsed.ms,
            });
            this._status.set_text('✗ yo do failed');
        }
        this._renderContent();
    }


    _renderContent() {
        this._contentBox.destroy_all_children();


        if (this._sceneDraft !== null) {
            this._contentBox.add_child(this._renderSceneDraft());
            return;
        }
        if (this._detailCard) {
            this._contentBox.add_child(this._renderCardDetail(this._detailCard));
            return;
        }
        if (this._detailDevice) {
            if (this._detailDevice.type === 'tv') {
                this._contentBox.add_child(this._renderTvDetail(this._detailDevice));
            } else { this._contentBox.add_child(this._renderDeviceDetail(this._detailDevice)); }
            return;
        }
        if (this._settingsView) {
            this._contentBox.add_child(this._renderSettingsView());
            return;
        }
        if (this._notifyView) {
            this._contentBox.add_child(this._renderNotifyView());
            return;
        }
        if (this._alarmsView) {
            this._contentBox.add_child(this._renderAlarmsView());
            return;
        }
        if (this._tvView) {
            this._contentBox.add_child(this._renderTvGuideView());
            return;
        }
        if (this._chatActive) {
            this._contentBox.add_child(this._renderChatView());
            return;
        }

        const q = this._searchQuery.trim();
        if (q) {
            const matches = sortDevices(
                this._devices.filter(d => d.friendly_name.toLowerCase().includes(q)),
                this._states);
            if (!matches.length) {
                if (!this._previewCmd) {
                    this._contentBox.add_child(plainLabel(
                        'Press enter to send…',
                        'opacity: 0.7; padding: 12px; font-style: italic;'));
                }
                return;
            }
            for (const d of matches) this._contentBox.add_child(this._deviceRow(d));
            return;
        }

        if (!this._selectedRoom) {
            this._contentBox.add_child(this._cardsSection());
        }

        const headerRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        const headerText = this._selectedRoom
            ? this._selectedRoom.toUpperCase()
            : 'SCENES';
        headerRow.add_child(plainLabel(headerText,
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        headerRow.add_child(new St.Widget({ x_expand: true }));

        if (this._selectedRoom) {
            const devs = this._devices.filter(d =>
                (d.room || 'other') === this._selectedRoom && ONOFF_TYPES.has(d.type));
            if (devs.length) {
                const onCount = devs.filter(d => {
                    const st = this._states[d.friendly_name] || {};
                    return st.state === 'ON' && !isOffline(st);
                }).length;
                const anyOn = onCount > 0;
                const pill = this._togglePill(
                    anyOn,
                    `${onCount}/${devs.length} on`,
                    () => this._roomCmd(this._selectedRoom, anyOn ? 'off' : 'on')
                );
                pill.style_class = 'zigduck-room-action'
                    + (anyOn ? ' zigduck-room-action-on' : '');
                headerRow.add_child(pill);
            }
        } else {
            const addBtn = new St.Button({
                can_focus: true, style_class: 'zigduck-icon-btn',
            });
            addBtn.set_child(new St.Icon({
                icon_name: 'list-add-symbolic', icon_size: 14,
            }));
            addBtn.connect('clicked', () => {
                this._sceneDraft = this._generateSceneDraft();
                this._detailCard   = null;
                this._detailDevice = null;
                this._settingsView = false;
                this._notifyView   = false;
                this._alarmsView   = false;
                this._tvView       = false;
                this._updateToolbarState();
                this._renderContent();
            });
            headerRow.add_child(addBtn);
        }
        this._contentBox.add_child(headerRow);

        if (this._selectedRoom) {
            if (this._roomIsEntertainment(this._selectedRoom)) {
                this._contentBox.add_child(this._syncSection());
            }
            const devs = sortDevices(
                this._devices.filter(d => (d.room || 'other') === this._selectedRoom),
                this._states);
            if (!devs.length) {
                this._contentBox.add_child(plainLabel('No devices in this room.',
                    'opacity: 0.6; padding: 8px;'));
                return;
            }
            for (const d of devs) this._contentBox.add_child(this._deviceRow(d));
            return;
        }


        if (!this._scenes.length) {
            this._contentBox.add_child(plainLabel('No scenes available. Check scenes.json.',
                'opacity: 0.6; padding: 8px;'));
            return;
        }

        const grid = new St.BoxLayout({ vertical: true, x_expand: true, style: 'spacing: 6px;' });
        for (let i = 0; i < this._scenes.length; i += 2) {
            const row = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
            row.add_child(this._sceneBtn(this._scenes[i]));
            if (this._scenes[i + 1]) row.add_child(this._sceneBtn(this._scenes[i + 1]));
            else                     row.add_child(new St.Widget({ x_expand: true }));
            grid.add_child(row);
        }
        this._contentBox.add_child(grid);
    }


    _cardsSection() {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 6px;',
        });

        const headerRow = new St.BoxLayout({
            x_expand: true, reactive: true, track_hover: true,
            style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        headerRow.add_child(plainLabel('CARDS',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        headerRow.add_child(new St.Widget({ x_expand: true }));

        const chevron = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        chevron.set_child(new St.Icon({
            icon_name: this._cardsOpen ? 'pan-down-symbolic' : 'pan-end-symbolic',
            icon_size: 14,
        }));
        headerRow.add_child(chevron);

        const toggle = () => {
            this._cardsOpen = !this._cardsOpen;
            this._renderContent();
        };
        headerRow.connect('button-release-event', () => {
            toggle(); return Clutter.EVENT_STOP;
        });
        chevron.connect('clicked', toggle);
        wrap.add_child(headerRow);

        if (!this._cardsOpen) return wrap;

        if (!this._cards.length) {
            wrap.add_child(plainLabel('No cards configured.',
                'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
            return wrap;
        }

        const groups = new Map();
        for (const c of this._cards) {
            const g = c.group || 'other';
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(c);
        }

        for (const [group, cards] of groups) {
            if (groups.size > 1) {
                wrap.add_child(plainLabel(group.toUpperCase(),
                    'opacity: 0.55; font-size: 0.75em; padding: 6px 0 2px 0;'));
            }
            for (const c of cards) wrap.add_child(this._cardRow(c));
        }
        return wrap;
    }

    _cardRow(card) {
        const available = card.available !== false;

        const rowStyle = available
            ? 'spacing: 6px; padding: 3px 5px; border-radius: 4px;'
            : 'spacing: 6px; padding: 3px 5px; border-radius: 4px; '
              + 'background-color: rgba(243, 156, 18, 0.10); '
              + 'border: 1px solid rgba(243, 156, 18, 0.30);';

        const row = new St.BoxLayout({
            x_expand: true, reactive: true, track_hover: true, style: rowStyle,
        });
        row.connect('button-release-event', () => {
            this._detailCard = card;
            this._renderContent();
            return Clutter.EVENT_STOP;
        });

        row.add_child(faIcon(card.icon, 16));

        row.add_child(plainLabel(card.title || card.id,
            card.color
                ? `color: ${card.color}; font-weight: bold;`
                : 'font-weight: bold;'));

        if (!available) {
            row.add_child(plainLabel('⚠️', 'font-size: 0.9em;'));
        } else if (isCardStale(card)) {
            row.add_child(plainLabel('⚠️',
                'font-size: 0.9em; color: #f39c12;'));
        }

        row.add_child(new St.Widget({ x_expand: true }));

        if (available) {
            row.add_child(plainLabel(String(card.value ?? '—'),
                'font-weight: bold; font-size: 0.95em;'));
        }

        return row;
    }

    _syncSection() {
        const room = this._selectedRoom;
        const sync = this._getSync(room);

        const liveOn        = this._syncIsOn();
        const liveModeCli   = this._syncLiveMode();
        const liveModeUi    = this._syncCliModeToUi(liveModeCli);
        const liveIntensity = this._syncLiveIntensityUi();
        const liveBrightness = Math.max(0, Math.min(100,
            Number(this._syncStatus?.brightness ?? 0)));
        const liveHdmi      = this._syncStatus?.hdmiSource || null;

        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true,
            style: 'spacing: 6px; padding: 8px 10px; margin-bottom: 8px; '
                 + 'border-radius: 6px; '
                 + 'background-color: rgba(139, 92, 246, 0.10); '
                 + 'border: 1px solid rgba(139, 92, 246, 0.35);',
        });

        const headerRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });

        const titleBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-pill',
            style: 'padding: 4px 10px;',
        });
        const tbox = new St.BoxLayout({ style: 'spacing: 6px;' });
        tbox.add_child(plainLabel(sync.open ? '▾' : '▸', 'opacity: 0.7;'));
        tbox.add_child(plainLabel('SYNC', 'font-weight: bold;'));
        titleBtn.set_child(tbox);
        titleBtn.connect('clicked', () => {
            sync.open = !sync.open;
            this._renderContent();
        });
        headerRow.add_child(titleBtn);

        headerRow.add_child(new St.Widget({ x_expand: true }));

        const toggle = this._togglePill(liveOn, liveOn ? 'On' : 'Off', () => {
            if (liveOn) this._syncOff(); else this._syncOn();
            if (!sync.open) sync.open = true;
        }, liveOn ? SYNC_ACCENT : null);
        headerRow.add_child(toggle);
        wrap.add_child(headerRow);

        if (!sync.open) return wrap;

        const modeRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
        const modes = [
            { ui: 'music',  cli: 'music', icon: 'music'           },
            { ui: 'movie',  cli: 'video', icon: 'movie'           },
            { ui: 'gaming', cli: 'game',  icon: 'gamepad-variant' },
        ];
        for (const { ui, icon } of modes) {
            const active = liveModeUi === ui;
            const style = 'padding: 6px 12px; border-radius: 6px; '
                + (active
                    ? `background-color: ${SYNC_ACCENT}; `
                    + `border: 2px solid ${SYNC_ACCENT}; color: #000;`
                    : 'background-color: rgba(255,255,255,0.06); '
                    + 'border: 1px solid rgba(255,255,255,0.12);');
            const b = new St.Button({
                can_focus: true, x_expand: true, style,
            });
            const inner = new St.BoxLayout({
                x_expand: true, y_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            inner.add_child(mdiIcon(icon, 18));
            b.set_child(inner);
            b.connect('clicked', () => this._syncSetModeUi(ui));
            modeRow.add_child(b);
        }
        wrap.add_child(modeRow);

        const levelRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 4px;' });
        for (const lvl of ['low', 'medium', 'high', 'extreme']) {
            const active = liveIntensity === lvl;
            const style = 'padding: 2px 6px; border-radius: 4px; font-size: 0.85em; '
                + (active
                    ? `background-color: ${SYNC_ACCENT}; `
                    + `border: 1px solid ${SYNC_ACCENT}; color: #000; font-weight: bold;`
                    : 'background-color: rgba(255,255,255,0.04); '
                    + 'border: 1px solid rgba(255,255,255,0.08);');
            const b = new St.Button({
                label: lvl, can_focus: true, x_expand: true, style,
            });
            b.connect('clicked', () => this._syncSetIntensityUi(lvl));
            levelRow.add_child(b);
        }
        wrap.add_child(levelRow);

        const bRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding-top: 4px;',
        });
        bRow.add_child(new St.Icon({
            icon_name: 'display-brightness-symbolic', icon_size: 14,
            y_align: Clutter.ActorAlign.CENTER,
        }));
        const s = new Slider.Slider(liveBrightness / 100);
        s.x_expand = true; s.y_align = Clutter.ActorAlign.CENTER;
        bRow.add_child(s);
        const pct = plainLabel(`${liveBrightness}%`,
            'width: 44px; text-align: right; font-size: 0.85em;');
        bRow.add_child(pct);

        let syncDebounce = 0;
        s.connect('notify::value', () => {
            const v = Math.round(s.value * 100);
            pct.set_text(`${v}%`);
            if (syncDebounce) GLib.source_remove(syncDebounce);
            syncDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                syncDebounce = 0;
                this._syncSetBrightness(v);
                return GLib.SOURCE_REMOVE;
            });
        });
        wrap.add_child(bRow);

        const hdmiRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 4px; padding-top: 4px;',
        });
        hdmiRow.add_child(plainLabel('HDMI',
            'opacity: 0.7; font-size: 0.85em; padding-right: 6px;'));
        for (let i = 1; i <= 4; i++) {
            const active = liveHdmi === `input${i}`;
            const style = 'padding: 2px 10px; border-radius: 4px; font-size: 0.85em; '
                + (active
                    ? `background-color: ${SYNC_ACCENT}; `
                    + `border: 1px solid ${SYNC_ACCENT}; color: #000; font-weight: bold;`
                    : 'background-color: rgba(255,255,255,0.04); '
                    + 'border: 1px solid rgba(255,255,255,0.08);');
            const b = new St.Button({
                label: String(i), can_focus: true, style,
            });
            b.connect('clicked', () => this._syncSetHdmiInput(i));
            hdmiRow.add_child(b);
        }
        hdmiRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(hdmiRow);

        return wrap;
    }


    _renderSettingsView() {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 6px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._settingsView = false;
            this._updateToolbarState();
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        titleRow.add_child(zigduckIcon(22));
        titleRow.add_child(plainLabel('ZIGDUCK',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(titleRow);

        const alarmsBtn = new St.Button({
            can_focus: true,
            style_class: 'zigduck-pill',
            style: 'padding: 10px 12px; margin: 2px 0; text-align: left;',
            x_expand: true,
        });
        {
            const box = new St.BoxLayout({ style: 'spacing: 10px;' });
            box.add_child(new St.Icon({
                icon_name: 'preferences-system-time-symbolic', icon_size: 16,
                y_align: Clutter.ActorAlign.CENTER,
            }));
            box.add_child(plainLabel('Alarms & Timers', 'font-size: 1em;'));
            box.add_child(new St.Widget({ x_expand: true }));
            alarmsBtn.set_child(box);
        }
        alarmsBtn.connect('clicked', () => this._openAlarmsView());
        wrap.add_child(alarmsBtn);

        const items = [
            { label: 'Media',         icon: 'multimedia-player-symbolic',
              url: null },
            { label: 'TV-Guide',      icon: 'applications-multimedia-symbolic',
              url: null,
              onOpen: () => this._openTvGuide() },
            { label: 'Changelog', icon: 'accessories-dictionary-symbolic',
              url: 'https://github.com/QuackHack-McBlindy/zigduck/blob/main/CHANGELOG.md' },
            { label: 'QuackHack-McBlindy.com', mdi: 'mdi:duck',
              url: 'https://quackhack-mcblindy.com' },
        ];
        for (const item of items) {
            const btn = new St.Button({
                can_focus: true,
                style_class: 'zigduck-pill',
                style: 'padding: 10px 12px; margin: 2px 0; text-align: left;',
                x_expand: true,
            });
            const box = new St.BoxLayout({ style: 'spacing: 10px;' });
            box.add_child(item.mdi
                ? mdiIcon(item.mdi, 16)
                : new St.Icon({
                    icon_name: item.icon, icon_size: 16,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            box.add_child(plainLabel(item.label, 'font-size: 1em;'));
            box.add_child(new St.Widget({ x_expand: true }));
            btn.set_child(box);
            btn.connect('clicked', () => {
                if (item.onOpen) { item.onOpen(); return; }
                if (item.url) {
                    try {
                        Gio.AppInfo.launch_default_for_uri(item.url, null);
                        this._status.set_text(`🌐 ${item.url}`);
                    } catch (e) {
                        this._status.set_text('✗ cannot open browser');
                        logError(e, 'Zigduck: launch_default_for_uri failed');
                    }
                } else {
                    this._status.set_text(`⚙ ${item.label}: not implemented`);
                }
            });
            wrap.add_child(btn);
        }
        return wrap;
    }

    async _openTvGuide() {
        this._tvView       = true;
        this._settingsView = false;
        this._notifyView   = false;
        this._alarmsView   = false;
        this._detailDevice = null;
        this._detailCard   = null;
        this._sceneDraft   = null;
        this._updateToolbarState();
        if (!this._tvIconsLoaded) {
            this._tvIcons = this._loadTvIcons();
            this._tvIconsLoaded = true;
        }
        await this._loadTvGuide();
        this._renderContent();
    }

    async _loadTvGuide() {
        try {
            const path = resolvePath('epg.json');
            const file = Gio.File.new_for_path(path);
            if (!file.query_exists(null)) {
                logError(new Error(`not found: ${path}`), 'Zigduck: epg.json');
                this._tvData = null;
                return;
            }
            const [, bytes] = file.load_contents(null);
            this._tvData = JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) {
            logError(e, 'Zigduck: could not parse epg.json');
            this._tvData = null;
        }
    }


    _loadBaseTopic() {
        try {
            const file = Gio.File.new_for_path(resolvePath(HOUSE_CONFIG_PATH));
            if (!file.query_exists(null)) return 'zigduck';
            const [, bytes] = file.load_contents(null);
            const data = JSON.parse(new TextDecoder().decode(bytes));
            const t = data?.mosquitto?.base_topic;
            return (typeof t === 'string' && t) ? t : 'zigduck';
        } catch (_) { return 'zigduck'; }
    }

    _loadHouseDevices() {
        const out = [];
        try {
            const file = Gio.File.new_for_path(resolvePath(HOUSE_CONFIG_PATH));
            if (!file.query_exists(null)) return out;
            const [, bytes] = file.load_contents(null);
            const data = JSON.parse(new TextDecoder().decode(bytes));
            const devices = (data && data.devices) || {};
            for (const [name, dev] of Object.entries(devices)) {
                if (!dev || dev.enable === false) continue;
                out.push({
                    id:            `house:${name}`,
                    hostKey:       name,
                    friendly_name: name,
                    type:          'host',
                    room:          dev.room || 'other',
                    icon:          dev.icon || null,
                    ip:            dev.ip || null,
                });
            }
        } catch (e) { logError(e, 'Zigduck: could not read config.json devices'); }
        return out;
    }

    _loadTvs() {
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

    _loadTvIcons() {
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

    _renderTvGuideView() {
        const outer = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 6px; padding: 4px 0;',
        });

        const navRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._tvView = false;
            this._settingsView = true;
            this._updateToolbarState();
            this._renderContent();
        });


        navRow.add_child(back);
        navRow.add_child(new St.Widget({ x_expand: true }));

        const scrapeBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        scrapeBtn.set_child(mdiIcon('shovel', 14));
        scrapeBtn.connect('clicked', async () => {
            this._status.set_text('… running tv-scraper');
            try {
                await runCmd([
                    'tv-scraper',
                    '--json-out', `${GLib.get_home_dir()}/.local/share/zigduck/epg.json`,
                ], 120);
                this._status.set_text('● scraper done');
                await this._loadTvGuide();
            } catch (e) {
                this._status.set_text('✗ ' + (e.message || 'scraper failed').slice(0, 60));
            }
            this._renderContent();
        });
        navRow.add_child(scrapeBtn);

        const refreshBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        refreshBtn.set_child(new St.Icon({
            icon_name: 'view-refresh-symbolic', icon_size: 14,
        }));
        refreshBtn.connect('clicked', async () => {
            this._status.set_text('… reloading EPG');
            await this._loadTvGuide();
            this._status.set_text('● done');
            this._renderContent();
        });
        navRow.add_child(refreshBtn);
        outer.add_child(navRow);

        const titleRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        titleRow.add_child(plainLabel('TV-GUIDE',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        outer.add_child(titleRow);

        if (!this._tvData || !Array.isArray(this._tvData.channels)
            || !this._tvData.channels.length) {
            outer.add_child(plainLabel('No EPG data. Check epg.json.',
                'opacity: 0.6; padding: 12px;'));
            return outer;
        }

        const listBox = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 6px;',
        });

        const now = new Date();
        const icons = this._tvIcons || {};

        const sortedChannels = [...this._tvData.channels].sort((a, b) => {
            const na = Number(a.id);
            const nb = Number(b.id);
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
            return String(a.id).localeCompare(String(b.id));
        });

        for (const ch of sortedChannels) {
            listBox.add_child(this._tvChannelCard(ch, now, icons));
        }

        const scroll = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style: 'max-height: 380px;',
        });
        scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
        scroll.add_child(listBox);
        outer.add_child(scroll);

        return outer;
    }

    _tvChannelCard(ch, now, icons) {
        const card = new St.BoxLayout({
            vertical: true, x_expand: true,
            style: 'spacing: 4px; padding: 8px 10px; border-radius: 6px; '
                 + 'background-color: rgba(255,255,255,0.04); '
                 + 'border: 1px solid rgba(255,255,255,0.08);',
        });

        const headRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const iconPath = icons[ch.id];
        if (iconPath && Gio.File.new_for_path(iconPath).query_exists(null)) {
            headRow.add_child(new St.Icon({
                gicon: new Gio.FileIcon({file: Gio.File.new_for_path(iconPath)}),
                icon_size: 20, y_align: Clutter.ActorAlign.CENTER,
            }));
        } else {
            headRow.add_child(new St.Icon({
                icon_name: 'video-display-symbolic', icon_size: 16,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'opacity: 0.7;',
            }));
        }
        headRow.add_child(plainLabel(String(ch.name || ch.id),
            'font-weight: bold; font-size: 1.05em;'));
        headRow.add_child(new St.Widget({ x_expand: true }));
        card.add_child(headRow);

        const parsed = (ch.programs || []).map(p => ({
            ...p,
            startDate: parseEpgTime(p.start),
            stopDate:  parseEpgTime(p.stop),
        })).filter(p => p.startDate && p.stopDate);

        let current = null;
        const upcoming = [];
        for (const p of parsed) {
            if (p.startDate <= now && now < p.stopDate) current = p;
            else if (p.startDate > now && upcoming.length < 2) upcoming.push(p);
        }

        if (!current && !upcoming.length) {
            card.add_child(plainLabel('No more programs.',
                'opacity: 0.6; font-size: 0.9em; padding: 4px 0;'));
            return card;
        }

        if (current) card.add_child(this._tvProgramRow(current, true));
        for (const p of upcoming) card.add_child(this._tvProgramRow(p, false));
        return card;
    }

    _tvProgramRow(p, isCurrent) {
        const row = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 2px 0;',
        });

        const timeStr = `${fmtHHMM(p.startDate)}–${fmtHHMM(p.stopDate)}`;
        row.add_child(plainLabel(timeStr,
            `font-size: 0.8em; font-family: monospace; `
          + `opacity: ${isCurrent ? 0.95 : 0.6}; width: 78px;`));

        if (isCurrent) {
            row.add_child(plainLabel('●',
                `color: ${GREEN}; font-size: 0.7em;`));
        }

        row.add_child(plainLabel(String(p.title || ''),
            isCurrent
                ? 'font-weight: bold; font-size: 0.95em;'
                : 'opacity: 0.8; font-size: 0.9em;'));

        return row;
    }

    async _openAlarmsView() {
        this._alarmsView   = true;
        this._settingsView = false;
        this._notifyView   = false;
        this._detailDevice = null;
        this._detailCard   = null;
        this._sceneDraft = null;
        this._updateToolbarState();
        await this._loadAlarmsAndTimers();
        this._renderContent();
    }

    async _loadAlarmsAndTimers() {
        try {
            const [aOut, tOut] = await Promise.all([
                runCli(['alarm', 'list'], 15).catch(() => '[]'),
                runCli(['timer', 'list'], 15).catch(() => '[]'),
            ]);
            try { this._alarms = JSON.parse(aOut) || []; } catch (_) { this._alarms = []; }
            try { this._timers = JSON.parse(tOut) || []; } catch (_) { this._timers = []; }
            if (!Array.isArray(this._alarms)) this._alarms = [];
            if (!Array.isArray(this._timers)) this._timers = [];
        } catch (e) {
            logError(e, 'Zigduck: load alarms/timers failed');
        }
    }

    _renderAlarmsView() {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._alarmsView = false;
            this._settingsView = true;
            this._updateToolbarState();
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        wrap.add_child(this._alarmsSection());
        wrap.add_child(this._timersSection());
        return wrap;
    }

    _sectionHeader(title, onAdd) {
        const row = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 6px 0;',
        });
        row.add_child(plainLabel(title,
            'font-size: 1.35em; font-weight: bold; opacity: 0.9;'));
        row.add_child(new St.Widget({ x_expand: true }));
        const addBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        addBtn.set_child(new St.Icon({
            icon_name: 'list-add-symbolic', icon_size: 14,
        }));
        addBtn.connect('clicked', onAdd);
        row.add_child(addBtn);
        return row;
    }

    _alarmsSection() {
        const sec = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 4px;',
        });
        sec.add_child(this._sectionHeader('ALARMS', () => {
            this._status.set_text('⏰ add alarm: not implemented');
        }));

        if (!this._alarms.length) {
            sec.add_child(plainLabel('No alarms.',
                'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
            return sec;
        }

        for (const a of this._alarms) {
            const row = new St.BoxLayout({
                x_expand: true,
                style: 'spacing: 8px; padding: 6px 10px; border-radius: 6px; '
                     + 'background-color: rgba(255,255,255,0.04); '
                     + 'border: 1px solid rgba(255,255,255,0.08);',
            });
            row.add_child(mdiIcon('alarm', 16));

            const hh = String(a.hour ?? 0).padStart(2, '0');
            const mm = String(a.minute ?? 0).padStart(2, '0');
            row.add_child(plainLabel(`${hh}:${mm}`,
                'font-weight: bold; font-size: 0.95em;'));
            row.add_child(plainLabel(String(a.name || ''),
                'opacity: 0.8; font-size: 0.9em;'));
            row.add_child(new St.Widget({ x_expand: true }));

            const on = !!a.enabled;
            const pill = this._togglePill(on, on ? 'On' : 'Off', () => {
                this._toggleAlarm(a);
            });
            row.add_child(pill);

            const rm = new St.Button({
                can_focus: true, style_class: 'zigduck-icon-btn',
            });
            rm.set_child(new St.Icon({
                icon_name: 'user-trash-symbolic', icon_size: 12,
                style: `color: ${RED};`,
            }));
            rm.connect('clicked', () => this._removeAlarm(a));
            row.add_child(rm);

            sec.add_child(row);
        }
        return sec;
    }

    _timersSection() {
        const sec = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 4px; padding-top: 6px;',
        });
        sec.add_child(this._sectionHeader('TIMERS', () => {
            this._status.set_text('⏱ add timer: not implemented');
        }));

        if (!this._timers.length) {
            sec.add_child(plainLabel('No timers.',
                'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
            return sec;
        }

        for (const t of this._timers) {
            const row = new St.BoxLayout({
                x_expand: true,
                style: 'spacing: 8px; padding: 6px 10px; border-radius: 6px; '
                     + 'background-color: rgba(255,255,255,0.04); '
                     + 'border: 1px solid rgba(255,255,255,0.08);',
            });
            row.add_child(mdiIcon('timer', 16));
            row.add_child(plainLabel(String(t.name || `timer ${t.id ?? ''}`),
                'font-weight: bold; font-size: 0.95em;'));
            row.add_child(new St.Widget({ x_expand: true }));

            const rm = new St.Button({
                can_focus: true, style_class: 'zigduck-icon-btn',
            });
            rm.set_child(new St.Icon({
                icon_name: 'user-trash-symbolic', icon_size: 12,
                style: `color: ${RED};`,
            }));
            rm.connect('clicked', () => this._cancelTimer(t));
            row.add_child(rm);

            sec.add_child(row);
        }
        return sec;
    }

    async _toggleAlarm(alarm) {
        const id = alarm.id;
        this._status.set_text(`… alarm toggle ${id}`);
        try {
            await runCli(['alarm', 'toggle', String(id)]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● done');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _removeAlarm(alarm) {
        const hh = String(alarm.hour ?? 0).padStart(2, '0');
        const mm = String(alarm.minute ?? 0).padStart(2, '0');
        this._status.set_text(`… removing alarm ${hh}:${mm}`);
        try {
            await runCli(['alarm', 'remove', '--time', `${hh}:${mm}`]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● removed');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _cancelTimer(timer) {
        const id = timer.id;
        if (id === undefined) {
            this._status.set_text('timer has no id — cannot cancel');
            return;
        }
        this._status.set_text(`… cancelling timer ${id}`);
        try {
            await runCli(['timer', 'cancel', String(id)]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● cancelled');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    _renderNotifyView() {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 6px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._notifyView = false;
            this._updateToolbarState();
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        titleRow.add_child(plainLabel('NOTIFY',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));

        const trashBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        trashBtn.set_child(new St.Icon({
            icon_name: 'user-trash-symbolic', icon_size: 14,
            style: `color: ${RED};`,
        }));
        trashBtn.connect('clicked', () => this._clearNotifications());
        titleRow.add_child(trashBtn);
        wrap.add_child(titleRow);

        const list = [...this._notifications].reverse();
        if (!list.length) {
            wrap.add_child(plainLabel('No notifications.',
                'opacity: 0.6; padding: 12px;'));
            return wrap;
        }

        for (const n of list) {
            const row = new St.BoxLayout({
                vertical: true, x_expand: true,
                style: 'spacing: 4px; padding: 8px 10px; '
                     + 'border-radius: 6px; '
                     + 'background-color: rgba(255,255,255,0.04); '
                     + 'border: 1px solid rgba(255,255,255,0.08);',
            });

            const msg = plainLabel(String(n.message || ''), 'font-size: 0.95em;');
            msg.x_expand = true;
            if (msg.clutter_text) {
                msg.clutter_text.line_wrap = true;
                msg.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            }
            row.add_child(msg);

            const timeRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
            timeRow.add_child(new St.Widget({ x_expand: true }));
            timeRow.add_child(plainLabel(formatNotifyTime(n.timestamp),
                'opacity: 0.7; font-size: 0.85em;'));
            row.add_child(timeRow);

            wrap.add_child(row);
        }
        return wrap;
    }

    async _clearNotifications() {
        this._status.set_text('… clearing notifications');
        try {
            await runCli(['--clear-notify']);
            this._notifications = [];
            this._updateBellBadge(0);
            this._status.set_text('🗑 cleared');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    _buildPanelIcon() {
        const svgPath = `${extensionDir()}/icons/zigduck-symbolic.svg`;
        const pngPath = `${extensionDir()}/icons/zigduck-32.png`;
        const svgFile = Gio.File.new_for_path(svgPath);
        if (svgFile.query_exists(null)) {
            return new St.Icon({
                gicon: new Gio.FileIcon({file: svgFile}),
                style_class: 'system-status-icon',
            });
        }
        const pngFile = Gio.File.new_for_path(pngPath);
        if (pngFile.query_exists(null)) {
            return new St.Icon({
                gicon: new Gio.FileIcon({file: pngFile}),
                style_class: 'system-status-icon',
            });
        }
        return new St.Icon({
            icon_name: 'preferences-system-symbolic',
            style_class: 'system-status-icon',
        });
    }



    _sceneBtn(name) {
        const isDark = this._sceneDark?.[name]   || false;
        const colors = this._sceneColors?.[name] || [];

        let palette = colors;
        if (SCENE_COLOR_OVERRIDES[name]) palette = [SCENE_COLOR_OVERRIDES[name]];
        else if (isDark)                 palette = ['#000000'];
        else if (!colors.length)         palette = ['#ffffff'];

        const btn = new St.Button({
            can_focus: true, x_expand: true,
            style: 'padding: 0; '
                 + 'border-radius: 8px; '
                 + 'border: 1px solid rgba(0,0,0,0.15); '
                 + 'min-height: 46px;',
        });

        const stack = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true, y_expand: true,
        });

        stack.add_child(buildGradientStrip(palette, 24));

        const lbl = plainLabel('✦ ' + name,
            `font-weight: bold; color: ${isDark ? '#fff' : '#000'};`);
        lbl.x_align = Clutter.ActorAlign.CENTER;
        lbl.y_align = Clutter.ActorAlign.CENTER;
        lbl.x_expand = true;
        lbl.y_expand = true;
        stack.add_child(lbl);

        btn.set_child(stack);
        btn.connect('clicked', () => this._runScene(name));
        return btn;
    }





    _batteryBadge(state) {
        const b = parseInt(state.battery, 10);
        if (!Number.isFinite(b)) return null;
        return plainLabel(`${b}%`,
            `color: ${batteryColor(b)}; font-weight: bold; `
          + `font-size: 0.85em; width: 40px; text-align: right;`);
    }

    _tempBadge(state) {
        for (const [k, v] of Object.entries(state)) {
            if (!/temp/i.test(k)) continue;
            const t = parseFloat(v);
            if (!Number.isFinite(t)) continue;
            return plainLabel(`${t.toFixed(1)}°C`,
                'opacity: 0.8; font-size: 0.85em; width: 54px; text-align: right;');
        }
        return null;
    }

    _powerBadge(state) {
        const p = parseFloat(state.power);
        if (!Number.isFinite(p)) return null;
        return plainLabel(`${Math.round(p)} W`,
            'opacity: 0.8; font-size: 0.85em; width: 50px; text-align: right;');
    }

    _occupancyBadge(state) {
        if (state.occupancy === undefined) return null;
        const detected = isTruthy(state.occupancy);
        return plainLabel(detected ? 'DETECTED' : 'no motion',
            `color: ${detected ? GREEN : RED}; font-weight: bold; font-size: 0.8em;`);
    }

    _leakBadge(state) {
        if (state.water_leak === undefined) return null;
        const leaking = isTruthy(state.water_leak);
        return plainLabel(leaking ? 'LEAK DETECTED!' : 'no leak',
            `color: ${leaking ? RED : GREEN}; font-weight: bold; font-size: 0.8em;`);
    }

    _contactBadge(state) {
        if (state.contact === undefined) return null;
        const closed = isTruthy(state.contact);
        return plainLabel(closed ? 'closed' : 'OPEN',
            `color: ${closed ? GREEN : RED}; font-weight: bold; font-size: 0.8em;`);
    }

    _blindButtons(device, state) {
        const pos    = parseInt(state.position, 10);
        const upOn   = pos === 100;
        const downOn = pos === 0;

        const box = new St.BoxLayout({ style: 'spacing: 4px;' });
        const mk = (label, active, onPress) => {
            const base = 'padding: 2px 10px; border-radius: 4px;';
            const glow = active
                ? `border: 2px solid ${GREEN}; color: ${GREEN}; font-weight: bold; `
                + `background-color: rgba(46, 204, 113, 0.18);`
                : '';
            const b = new St.Button({
                can_focus: true, label,
                style_class: 'zigduck-pill',
                style: base + ' ' + glow,
            });
            b.connect('clicked', onPress);
            return b;
        };
        box.add_child(mk('▲', upOn,   () => this._devCmd(device, 'on')));
        box.add_child(mk('▼', downOn, () => this._devCmd(device, 'off')));
        return box;
    }

    _stateControl(d, state) {
        const occ = this._occupancyBadge(state);
        if (occ) return occ;

        const leak = this._leakBadge(state);
        if (leak) return leak;

        const contact = this._contactBadge(state);
        if (contact) return contact;

        if (state.position !== undefined && !ONOFF_TYPES.has(d.type)) {
            return this._blindButtons(d, state);
        }

        if (d.type === 'tv') {
            const st = this._tvGetState(d.tvKey);
            return this._togglePill(st.power, st.power ? 'On' : 'Off',
                () => this._tvToggleFromList(d),
                st.power ? ROOM_ON_COLOR : null);
        }

        if (d.type === 'host' && d.ip) {
            return this._pingRowButton(d);
        }

        if (ONOFF_TYPES.has(d.type)) {
            const syncActive = this._syncIsOn() && this._roomIsEntertainment(d.room);

            const isOn = syncActive || state.state === 'ON';
            const off  = !syncActive && isOffline(state);

            let accent = null;
            if (syncActive) {
                accent = SYNC_ACCENT;
            } else if (isOn && LIGHT_TYPES.has(d.type) && !off) {
                accent = colorFromState(state);
            }

            const onClick = syncActive
                ? () => { this._status.set_text('🟣 sync active — use the sync panel'); }
                : () => this._devCmd(d, 'toggle');

            return this._togglePill(
                isOn,
                isOn ? 'On' : 'Off',
                onClick,
                accent,
                off,
                syncActive,
            );
        }

        return null;
    }

    async _tvToggleFromList(tv) {
        const st = this._tvGetState(tv.tvKey);
        st.power = !st.power;
        this._renderContent();
        await this._tvSend(tv, st.power ? 'on' : 'off');
    }


    _deviceRow(d) {
        const state = this._states[d.friendly_name] || {};
        const offline = this._isOfflineFor(d, state);
        const syncActive = this._syncIsOn()
                        && this._roomIsEntertainment(d.room)
                        && ONOFF_TYPES.has(d.type);

        let rowStyle;
        if (syncActive) {
            rowStyle = 'spacing: 6px; padding: 3px 5px; border-radius: 4px; '
                     + 'background-color: rgba(139, 92, 246, 0.16); '
                     + 'border: 1px solid rgba(139, 92, 246, 0.45);';
        } else if (offline) {
            rowStyle = 'spacing: 6px; padding: 3px 5px; border-radius: 4px; '
                     + 'background-color: rgba(243, 156, 18, 0.14); '
                     + 'border: 1px solid rgba(243, 156, 18, 0.40);';
        } else {
            rowStyle = 'spacing: 6px; padding: 3px 5px; border-radius: 4px;';
        }

        const row = new St.BoxLayout({
            x_expand: true, reactive: true, track_hover: true, style: rowStyle,
        });
        row.connect('button-release-event', () => {
            this._detailDevice = d;
            this._renderContent();
            return Clutter.EVENT_STOP;
        });

        row.add_child(mdiIcon(d.icon, 16));
        if (offline) {
            row.add_child(plainLabel('⚠️', 'font-size: 0.9em;'));
        }
        row.add_child(plainLabel(d.friendly_name,
            offline ? 'color: #f39c12; font-weight: bold;' : ''));

        row.add_child(new St.Widget({ x_expand: true }));

        const b = this._batteryBadge(state);
        if (b) row.add_child(b);
        const t = this._tempBadge(state);
        if (t) row.add_child(t);
        const p = this._powerBadge(state);
        if (p) row.add_child(p);
        const ctrl = this._stateControl(d, state);
        if (ctrl) row.add_child(ctrl);

        return row;
    }

    _colorSwatch(device, hex, char = '', isRandom = false) {
        const base = isRandom
            ? 'width: 26px; height: 26px; border-radius: 13px; '
              + 'background-image: linear-gradient(135deg, #ff0000, #ff8c00, #ffd700, #00ff00, #00ced1, #0000ff, #8a2be2); '
              + 'border: 1px solid rgba(255,255,255,0.25);'
            : `width: 26px; height: 26px; border-radius: 13px; `
              + `background-color: ${hex}; `
              + `border: 1px solid rgba(255,255,255,0.25);`;

        const b = new St.Button({ can_focus: true, style: base });

        const lbl = plainLabel(char, 'font-size: 0.95em; font-weight: bold; color: #fff; '
                                    + 'text-shadow: 0 0 3px rgba(0,0,0,0.6);');
        lbl.x_align = Clutter.ActorAlign.CENTER;
        lbl.y_align = Clutter.ActorAlign.CENTER;
        lbl.x_expand = true; lbl.y_expand = true;
        b.set_child(lbl);

        b.connect('notify::hover', () => {
            lbl.set_text(b.hover ? '🦆' : char);
        });

        b.connect('clicked', () => {
            if (isRandom) this._devColor(device, randomHex());
            else          this._devColor(device, hex);
        });
        return b;
    }

    _tvGetState(tvKey) {
        if (!this._tvState[tvKey]) {
            this._tvState[tvKey] = {
                power: false,
                volume: 50,
                channelsOpen: false,
                remoteOpen: false,
            };
        }
        return this._tvState[tvKey];
    }

    async _tvSend(tv, typ, extra = []) {
        this._status.set_text(`… tv --typ ${typ} --ip ${tv.ip}`);
        try {
            await runCmd(['tv', '--typ', typ, '--ip', tv.ip, ...extra], 15);
            this._status.set_text('● done');
            return true;
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
            return false;
        }
    }

    async _tvFlushVolume(tv, st, target) {
        const diff = target - st.volume;
        if (diff === 0) return;
        st.volume = target;
        const typ   = diff > 0 ? 'up' : 'down';
        const count = Math.min(Math.abs(diff), 30);
        this._status.set_text(`… volume ${typ} × ${count}`);
        try {
            const proms = [];
            for (let i = 0; i < count; i++) {
                proms.push(runCmd(['tv', '--typ', typ, '--ip', tv.ip], 10)
                    .catch(() => {}));
            }
            await Promise.all(proms);
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    _renderTvDetail(tv) {
        const st = this._tvGetState(tv.tvKey);
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._detailDevice = null;
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        titleRow.add_child(mdiIcon('television', 26));
        titleRow.add_child(plainLabel(tv.friendly_name,
            'font-weight: bold; font-size: 1.15em;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        if (tv.is_default) {
            titleRow.add_child(plainLabel('DEFAULT',
                `color: ${GREEN}; font-weight: bold; font-size: 0.7em; `
              + `border: 1px solid ${GREEN}; border-radius: 3px; padding: 1px 6px;`));
        }
        wrap.add_child(titleRow);

        const powerRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 6px; padding-top: 4px;',
        });
        const powerBtn = this._togglePill(
            st.power,
            st.power ? 'On' : 'Off',
            async () => {
                st.power = !st.power;
                this._renderContent();
                await this._tvSend(tv, st.power ? 'on' : 'off');
            },
            st.power ? ROOM_ON_COLOR : null,
        );
        powerRow.add_child(powerBtn);

        const findBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-pill',
            style: 'padding: 3px 12px;',
        });
        const fb = new St.BoxLayout({ style: 'spacing: 6px;' });
        fb.add_child(mdiIcon('remote', 14));
        fb.add_child(plainLabel('Find', ''));
        findBtn.set_child(fb);
        findBtn.connect('clicked', () => this._tvSend(tv, 'call'));
        powerRow.add_child(findBtn);

        powerRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(powerRow);

        const volRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding-top: 6px;',
        });
        volRow.add_child(new St.Icon({
            icon_name: 'audio-volume-medium-symbolic', icon_size: 14,
            y_align: Clutter.ActorAlign.CENTER,
        }));
        const volSlider = new Slider.Slider(st.volume / 100);
        volSlider.x_expand = true;
        volSlider.y_align = Clutter.ActorAlign.CENTER;
        volRow.add_child(volSlider);

        const volPct = plainLabel(`${st.volume}%`,
            'width: 40px; text-align: right; font-size: 0.85em;');
        volRow.add_child(volPct);

        let targetVol = st.volume;
        let volDebounce = 0;
        volSlider.connect('notify::value', () => {
            const pct = Math.round(volSlider.value * 100);
            volPct.set_text(`${pct}%`);
            targetVol = pct;
            if (volDebounce) GLib.source_remove(volDebounce);
            volDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                volDebounce = 0;
                this._tvFlushVolume(tv, st, targetVol);
                return GLib.SOURCE_REMOVE;
            });
        });
        wrap.add_child(volRow);

        const transportRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 6px; padding-top: 4px;',
        });
        const mkTransport = (label, typ) => {
            const b = new St.Button({
                can_focus: true, x_expand: true,
                style: 'padding: 8px 0; border-radius: 6px; '
                     + 'background-color: rgba(255,255,255,0.06); '
                     + 'border: 1px solid rgba(255,255,255,0.12);',
            });
            b.set_child(plainLabel(label, 'font-weight: bold; font-size: 1.15em;'));
            b.connect('clicked', () => this._tvSend(tv, typ));
            return b;
        };
        transportRow.add_child(mkTransport('⏮', 'prev'));
        transportRow.add_child(mkTransport('⏯', 'pause'));
        transportRow.add_child(mkTransport('⏭', 'next'));
        wrap.add_child(transportRow);

        wrap.add_child(this._tvCollapsibleHeader(
            'CHANNELS', st.channelsOpen, () => {
                st.channelsOpen = !st.channelsOpen;
                this._renderContent();
            },
        ));

        if (st.channelsOpen) {
            const epgRow = new St.BoxLayout({
                x_expand: true, style: 'padding: 4px 0 8px 0;',
            });
            epgRow.add_child(new St.Widget({ x_expand: true }));
            const epgBtn = new St.Button({
                can_focus: true,
                style_class: 'zigduck-pill',
                style: 'padding: 6px 20px;',
            });
            const epgInner = new St.BoxLayout({ style: 'spacing: 6px;' });
            epgInner.add_child(new St.Icon({
                icon_name: 'view-list-symbolic', icon_size: 14,
                y_align: Clutter.ActorAlign.CENTER,
            }));
            epgInner.add_child(plainLabel('EPG', 'font-weight: bold;'));
            epgBtn.set_child(epgInner);
            epgBtn.connect('clicked', () => this._openTvGuide());
            epgRow.add_child(epgBtn);
            epgRow.add_child(new St.Widget({ x_expand: true }));
            wrap.add_child(epgRow);

            const chanEntries = Object.entries(tv.channels || {})
                .map(([k, ch]) => ({ key: k, ...ch }))
                .sort((a, b) => {
                    const na = Number(a.id ?? a.key);
                    const nb = Number(b.id ?? b.key);
                    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
                    return String(a.key).localeCompare(String(b.key));
                });

            if (!chanEntries.length) {
                wrap.add_child(plainLabel('No channels.',
                    'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
            } else {
                const grid = new St.BoxLayout({
                    vertical: true, x_expand: true, style: 'spacing: 6px;',
                });
                for (let i = 0; i < chanEntries.length; i += 6) {
                    const row = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
                    for (let j = 0; j < 6; j++) {
                        const ch = chanEntries[i + j];
                        if (!ch) {
                            row.add_child(new St.Widget({ x_expand: true }));
                            continue;
                        }
                        const btn = new St.Button({
                            can_focus: true, x_expand: true,
                            style: 'padding: 6px; border-radius: 6px; '
                                 + 'background-color: rgba(255,255,255,0.06); '
                                 + 'border: 1px solid rgba(255,255,255,0.12);',
                        });
                        const inner = new St.BoxLayout({
                            x_expand: true, y_expand: true,
                            x_align: Clutter.ActorAlign.CENTER,
                            y_align: Clutter.ActorAlign.CENTER,
                        });
                        if (ch.icon && Gio.File.new_for_path(ch.icon).query_exists(null)) {
                            inner.add_child(new St.Icon({
                                gicon: new Gio.FileIcon({file: Gio.File.new_for_path(ch.icon)}),
                                icon_size: 24, y_align: Clutter.ActorAlign.CENTER,
                            }));
                        } else {
                            inner.add_child(plainLabel(String(ch.id ?? ch.key),
                                'font-weight: bold; font-size: 1em;'));
                        }
                        btn.set_child(inner);
                        btn.connect('clicked', () => {
                            this._status.set_text(
                                `📺 channel ${ch.id ?? ch.key} — needs yo wrapper`);
                        });
                        row.add_child(btn);
                    }
                    grid.add_child(row);
                }
                wrap.add_child(grid);
            }
        }

        wrap.add_child(this._tvCollapsibleHeader(
            'BUTTONS', st.remoteOpen, () => {
                st.remoteOpen = !st.remoteOpen;
                this._renderContent();
            },
        ));

        if (st.remoteOpen) {
            wrap.add_child(this._tvRemotePanel(tv));
        }

        wrap.add_child(plainLabel('Details',
            'font-weight: bold; margin-top: 4px;'));
        const details = [
            ['ip',         tv.ip],
            ['room',       tv.room],
            ['is_default', tv.is_default ? 'yes' : 'no'],
            ['channels',   String(Object.keys(tv.channels || {}).length)],
            ['apps',       String(Object.keys(tv.apps || {}).length)],
        ];
        for (const [k, v] of details) {
            if (v === null || v === undefined || v === '') continue;
            const r = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
            r.add_child(plainLabel(k, 'opacity: 0.7; font-size: 0.85em;'));
            r.add_child(new St.Widget({ x_expand: true }));
            r.add_child(plainLabel(String(v), 'font-size: 0.85em;'));
            wrap.add_child(r);
        }

        return wrap;
    }


    _tvCollapsibleHeader(label, isOpen, onToggle) {
        const row = new St.BoxLayout({
            x_expand: true, reactive: true, track_hover: true,
            style: 'spacing: 8px; padding: 8px 0 4px 0;',
        });
        row.add_child(plainLabel(label,
            'font-size: 1.25em; font-weight: bold; opacity: 0.9;'));
        row.add_child(new St.Widget({ x_expand: true }));

        const chev = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        chev.set_child(new St.Icon({
            icon_name: isOpen ? 'pan-down-symbolic' : 'pan-end-symbolic',
            icon_size: 14,
        }));
        row.add_child(chev);

        row.connect('button-release-event', () => { onToggle(); return Clutter.EVENT_STOP; });
        chev.connect('clicked', onToggle);
        return row;
    }

    _tvRemotePanel(tv) {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px;',
        });

        const send = (typ) => this._tvSend(tv, typ);

        const mkIconBtn = (icon, typ) => {
            const b = new St.Button({
                can_focus: true,
                style: 'padding: 6px 12px; border-radius: 6px; '
                     + 'background-color: rgba(255,255,255,0.06); '
                     + 'border: 1px solid rgba(255,255,255,0.12);',
            });
            b.set_child(new St.Icon({ icon_name: icon, icon_size: 16 }));
            b.connect('clicked', () => send(typ));
            return b;
        };

        const mkBtn = (label, typ, square = false) => {
            const style = square
                ? 'width: 44px; padding: 8px 0; border-radius: 6px; '
                  + 'background-color: rgba(255,255,255,0.06); '
                  + 'border: 1px solid rgba(255,255,255,0.12);'
                : 'padding: 8px 14px; border-radius: 6px; '
                  + 'background-color: rgba(255,255,255,0.06); '
                  + 'border: 1px solid rgba(255,255,255,0.12);';
            const b = new St.Button({ can_focus: true, style });
            b.set_child(plainLabel(label,
                `font-weight: bold; font-size: ${square ? 1.15 : 1.3}em;`));
            b.connect('clicked', () => send(typ));
            return b;
        };

        const sysRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
        sysRow.add_child(new St.Widget({ x_expand: true }));
        sysRow.add_child(mkIconBtn('go-previous-symbolic', 'nav_back'));
        sysRow.add_child(mkIconBtn('go-home-symbolic',     'nav_home'));
        sysRow.add_child(mkIconBtn('open-menu-symbolic',   'nav_menu'));
        sysRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(sysRow);

        const mainRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });

        const volCol = new St.BoxLayout({
            vertical: true, style: 'spacing: 4px;',
        });
        volCol.add_child(mkBtn('+', 'up'));
        volCol.add_child(mkBtn('−', 'down'));
        mainRow.add_child(volCol);

        mainRow.add_child(new St.Widget({ x_expand: true }));

        const dpad = new St.BoxLayout({
            vertical: true, style: 'spacing: 4px;',
        });
        const dpadA = new St.BoxLayout({ style: 'spacing: 4px;' });
        dpadA.add_child(new St.Widget({ x_expand: true }));
        dpadA.add_child(mkBtn('▲', 'nav_up', true));
        dpadA.add_child(new St.Widget({ x_expand: true }));
        dpad.add_child(dpadA);

        const dpadB = new St.BoxLayout({ style: 'spacing: 4px;' });
        dpadB.add_child(mkBtn('◀', 'nav_left',   true));
        dpadB.add_child(mkBtn('●', 'nav_select', true));
        dpadB.add_child(mkBtn('▶', 'nav_right',  true));
        dpad.add_child(dpadB);

        const dpadC = new St.BoxLayout({ style: 'spacing: 4px;' });
        dpadC.add_child(new St.Widget({ x_expand: true }));
        dpadC.add_child(mkBtn('▼', 'nav_down', true));
        dpadC.add_child(new St.Widget({ x_expand: true }));
        dpad.add_child(dpadC);

        mainRow.add_child(dpad);

        mainRow.add_child(new St.Widget({ x_expand: true }));

        const chanCol = new St.BoxLayout({
            vertical: true, style: 'spacing: 4px;',
        });
        chanCol.add_child(mkBtn('↑', 'channel_up'));
        chanCol.add_child(mkBtn('↓', 'channel_down'));
        mainRow.add_child(chanCol);

        wrap.add_child(mainRow);


        return wrap;
    }

    _renderChatView() {
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._chatActive   = false;
            this._chatMessages = [];
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 4px 0;',
        });
        titleRow.add_child(plainLabel('💬 CHAT',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(titleRow);

        const scroll = new St.ScrollView({
            x_expand: true, y_expand: true,
            style: 'max-height: 380px;',
        });
        scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);

        const list = new St.BoxLayout({
            vertical: true, x_expand: true,
            style: 'spacing: 6px; padding: 4px 2px;',
        });
        for (const m of this._chatMessages) {
            list.add_child(this._chatBubble(m.role, m.text, {
                command: m.command,
                ms:      m.ms,
            }));
        }

        scroll.add_child(list);
        wrap.add_child(scroll);

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            const vadj = scroll.get_vadjustment();
            if (vadj) vadj.set_value(vadj.get_upper() - vadj.get_page_size());
            return GLib.SOURCE_REMOVE;
        });

        return wrap;
    }


    _chatBubble(role, text, meta = {}) {
        const isUser = role === 'user';

        const col = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 2px;',
        });

        if (!isUser && (meta.command || Number.isFinite(meta.ms))) {
            const header = new St.BoxLayout({
                x_expand: true, style: 'spacing: 8px; padding: 0 4px;',
            });

            if (Number.isFinite(meta.ms)) {
                header.add_child(plainLabel(`${meta.ms.toFixed(1)} ms`,
                    'font-size: 0.7em; opacity: 0.55;'));
            }

            if (meta.command) {
                header.add_child(plainLabel(meta.command,
                    'font-family: monospace; font-size: 0.75em; '
                  + 'color: #9ecbff; opacity: 0.7;'));
            }

            header.add_child(new St.Widget({ x_expand: true }));
            col.add_child(header);
        }


        const row = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 1px 0;',
        });
        if (isUser) row.add_child(new St.Widget({ x_expand: true }));

        const bubbleBox = new St.BoxLayout({
            vertical: true,
            style: 'padding: 8px 12px; '
                 + 'border-radius: 14px; '
                 + 'max-width: 260px; '
                 + (isUser
                     ? 'background-color: #2ecc71;'
                     : 'background-color: #3498db;'),
        });

        const bubble = new St.Label({
            text: String(text),
            x_expand: true,
            style: 'font-size: 0.9em; '
                 + (isUser ? 'color: #000;' : 'color: #fff;'),
        });
        if (bubble.clutter_text) {
            bubble.clutter_text.line_wrap = true;
            bubble.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            bubble.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            bubble.clutter_text.set_selectable(true);
        }
        bubbleBox.add_child(bubble);
        row.add_child(bubbleBox);

        if (!isUser) row.add_child(new St.Widget({ x_expand: true }));

        col.add_child(row);
        return col;
    }

    _renderSceneDraft() {
        const draft = this._sceneDraft || '';
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._sceneDraft = null;
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 4px 0;',
        });
        titleRow.add_child(plainLabel('✦ NEW SCENE',
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(titleRow);

        const onCount = (draft.match(/\{ state = "ON"/g) || []).length;
        wrap.add_child(plainLabel(
            onCount
                ? `${onCount} light${onCount === 1 ? '' : 's'} currently ON — paste under house.zigbee.scenes`
                : 'No lights are currently ON.',
            'opacity: 0.65; font-size: 0.85em; padding-bottom: 6px;'));

        const scroll = new St.ScrollView({
            x_expand: true, y_expand: true,
            style: 'max-height: 340px;',
        });
        scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);

        const textLabel = new St.Label({ text: draft });
        if (textLabel.clutter_text) {
            textLabel.clutter_text.set_selectable(true);
            textLabel.clutter_text.set_editable(false);
        }
        textLabel.style =
            'font-family: monospace; font-size: 0.85em; '
          + 'padding: 8px 10px; '
          + 'background-color: rgba(0,0,0,0.25); '
          + 'border: 1px solid rgba(255,255,255,0.10); '
          + 'border-radius: 6px;';
        scroll.add_child(textLabel);
        wrap.add_child(scroll);

        const copyRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding-top: 6px;',
        });
        copyRow.add_child(new St.Widget({ x_expand: true }));

        const copyBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-pill',
            style: 'padding: 8px 20px;',
        });
        const cb = new St.BoxLayout({ style: 'spacing: 6px;' });
        cb.add_child(new St.Icon({
            icon_name: 'edit-copy-symbolic', icon_size: 14,
            y_align: Clutter.ActorAlign.CENTER,
        }));
        cb.add_child(plainLabel('Copy to clipboard', 'font-weight: bold;'));
        copyBtn.set_child(cb);
        copyBtn.connect('clicked', () => {
            const clip = St.Clipboard.get_default();
            clip.set_text(St.ClipboardType.CLIPBOARD, draft);
            this._status.set_text('📋 copied scene draft');
        });
        copyRow.add_child(copyBtn);
        copyRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(copyRow);

        return wrap;
    }


    _renderCardDetail(card) {
        const available = card.available !== false;
        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._detailCard = null;
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));

        const refreshBtn = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        refreshBtn.set_child(new St.Icon({
            icon_name: 'view-refresh-symbolic', icon_size: 14,
        }));
        refreshBtn.connect('clicked', async () => {
            await this._refresh();
            const fresh = this._cards.find(c => c.id === card.id);
            if (fresh) this._detailCard = fresh;
            this._renderContent();
        });
        backRow.add_child(refreshBtn);
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        titleRow.add_child(faIcon(card.icon, 26));
        titleRow.add_child(plainLabel(card.title || card.id,
            'font-weight: bold; font-size: 1.15em; '
          + (card.color ? `color: ${card.color};` : '')));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        if (!available) {
            titleRow.add_child(plainLabel('OFFLINE',
                `color: ${RED}; font-weight: bold; font-size: 0.75em; `
              + `border: 1px solid ${RED}; border-radius: 3px; padding: 1px 6px;`));
        }
        wrap.add_child(titleRow);

        if (!available) {
            wrap.add_child(plainLabel('No data available for this card.',
                'opacity: 0.7; padding: 12px 0; font-style: italic;'));
            if (card.error) {
                wrap.add_child(plainLabel(String(card.error),
                    'opacity: 0.5; font-size: 0.8em; font-family: monospace;'));
            }
            return wrap;
        }

        wrap.add_child(plainLabel(String(card.value ?? '—'),
            `font-size: 2.1em; font-weight: bold; padding: 4px 0; `
          + (card.color ? `color: ${card.color};` : '')));

        if (card.last_updated) {
            const stale = isCardStale(card);
            wrap.add_child(plainLabel(
                `Updated ${timeAgo(card.last_updated)}${stale ? '  ⚠️' : ''}`,
                stale
                    ? 'color: #f39c12; font-weight: bold; '
                    + 'font-size: 0.85em; padding-bottom: 6px; opacity: 1;'
                    : 'opacity: 0.65; font-size: 0.85em; padding-bottom: 6px;'));
        }

        if (card.details) {
            wrap.add_child(plainLabel(String(card.details),
                'opacity: 0.8; font-size: 0.9em; padding-bottom: 6px;'));
        }

        const hist = Array.isArray(card.history) ? card.history : null;
        if (card.chart && hist && hist.length > 1) {
            wrap.add_child(this._sparkline(hist, card.color || '#8b5cf6'));

            const nums = hist.map(Number).filter(Number.isFinite);
            if (nums.length) {
                const lo = Math.min(...nums);
                const hi = Math.max(...nums);
                const range = new St.BoxLayout({
                    x_expand: true, style: 'spacing: 8px; padding-top: 4px;',
                });
                range.add_child(plainLabel(`min ${lo}`,
                    'opacity: 0.7; font-size: 0.8em;'));
                range.add_child(new St.Widget({ x_expand: true }));
                range.add_child(plainLabel(`${nums.length} pts`,
                    'opacity: 0.5; font-size: 0.8em;'));
                range.add_child(new St.Widget({ x_expand: true }));
                range.add_child(plainLabel(`max ${hi}`,
                    'opacity: 0.7; font-size: 0.8em;'));
                wrap.add_child(range);
            }
        } else if (card.chart) {
            wrap.add_child(plainLabel('No history data yet.',
                'opacity: 0.6; padding: 8px 0; font-size: 0.9em;'));
        }

        const meta = [];
        if (card.group)  meta.push(['group', card.group]);
        if (card.format) meta.push(['format', card.format]);
        if (card.id)     meta.push(['id', card.id]);
        if (meta.length) {
            wrap.add_child(plainLabel('Details',
                'font-weight: bold; margin-top: 4px;'));
            for (const [k, v] of meta) {
                const r = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
                r.add_child(plainLabel(k, 'opacity: 0.7; font-size: 0.85em;'));
                r.add_child(new St.Widget({ x_expand: true }));
                r.add_child(plainLabel(String(v),
                    'font-size: 0.85em; font-family: monospace;'));
                wrap.add_child(r);
            }
        }

        return wrap;
    }

    _sparkline(history, color) {
        const nums = history.map(Number).filter(Number.isFinite);
        if (nums.length < 2) return new St.Widget({ style: 'height: 1px;' });

        const area = new St.DrawingArea({
            x_expand: true,
            style: 'height: 100px; '
                 + 'background-color: rgba(255,255,255,0.04); '
                 + 'border: 1px solid rgba(255,255,255,0.08); '
                 + 'border-radius: 6px;',
        });

        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        const span = (hi - lo) || 1;

        const m = /^#?([0-9a-f]{6})$/i.exec(color || '#8b5cf6');
        const rgb = m ? [
            parseInt(m[1].slice(0, 2), 16) / 255,
            parseInt(m[1].slice(2, 4), 16) / 255,
            parseInt(m[1].slice(4, 6), 16) / 255,
        ] : [0.55, 0.36, 0.96];

        area.connect('repaint', () => {
            const cr = area.get_context();
            const [w, h] = area.get_surface_size();
            const padX = 8, padY = 8;
            const usableW = Math.max(1, w - padX * 2);
            const usableH = Math.max(1, h - padY * 2);

            const xAt = i => padX + (i / (nums.length - 1)) * usableW;
            const yAt = v => padY + (1 - (v - lo) / span) * usableH;

            cr.moveTo(xAt(0), h - padY);
            for (let i = 0; i < nums.length; i++) cr.lineTo(xAt(i), yAt(nums[i]));
            cr.lineTo(xAt(nums.length - 1), h - padY);
            cr.closePath();
            cr.setSourceRGBA(rgb[0], rgb[1], rgb[2], 0.20);
            cr.fill();

            cr.setLineWidth(2);
            cr.setSourceRGBA(rgb[0], rgb[1], rgb[2], 0.95);
            for (let i = 0; i < nums.length; i++) {
                if (i === 0) cr.moveTo(xAt(i), yAt(nums[i]));
                else         cr.lineTo(xAt(i), yAt(nums[i]));
            }
            cr.stroke();

            const lx = xAt(nums.length - 1);
            const ly = yAt(nums[nums.length - 1]);
            cr.arc(lx, ly, 3, 0, 2 * Math.PI);
            cr.setSourceRGBA(rgb[0], rgb[1], rgb[2], 1.0);
            cr.fill();

            cr.$dispose();
        });

        return area;
    }


    _renderDeviceDetail(d) {
        const state = this._states[d.friendly_name] || {};
        const offline = this._isOfflineFor(d, state);

        const wrap = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 8px; padding: 4px 0;',
        });

        const backRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        const back = new St.Button({
            can_focus: true, style_class: 'zigduck-back-btn',
            style: 'width: 30px; height: 30px; border-radius: 15px; '
                 + 'background-color: rgba(255,255,255,0.10); '
                 + 'border: 1px solid rgba(255,255,255,0.15);',
        });
        back.set_child(new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 14 }));
        back.connect('clicked', () => {
            this._detailDevice = null;
            this._renderContent();
        });
        backRow.add_child(back);
        backRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(backRow);

        const titleRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
        titleRow.add_child(mdiIcon(d.icon, 26));
        titleRow.add_child(plainLabel(d.friendly_name,
            'font-weight: bold; font-size: 1.15em;'));
        titleRow.add_child(new St.Widget({ x_expand: true }));
        if (offline) {
            titleRow.add_child(plainLabel('OFFLINE',
                `color: ${RED}; font-weight: bold; font-size: 0.75em; `
              + `border: 1px solid ${RED}; border-radius: 3px; padding: 1px 6px;`));
        }
        wrap.add_child(titleRow);

        const summary = new St.BoxLayout({
            x_expand: true, style: 'spacing: 6px;', reactive: false,
        });
        const mutedStyle = 'opacity: 0.7; font-size: 0.85em;';
        const dots = () => plainLabel('·', 'opacity: 0.4;');

        if (d.type) summary.add_child(plainLabel(d.type, mutedStyle));
        if (d.room) {
            if (summary.get_n_children()) summary.add_child(dots());
            summary.add_child(plainLabel(d.room, mutedStyle));
        }
        const lastMs = lastSeenMs(state);
        if (lastMs) {
            if (summary.get_n_children()) summary.add_child(dots());
            const iso = new Date(lastMs).toISOString();
            summary.add_child(plainLabel(`seen ${timeAgo(iso)}`,
                `color: ${offline ? RED : GREEN}; font-weight: bold; font-size: 0.85em;`));
        }
        if (state.linkquality) {
            if (summary.get_n_children()) summary.add_child(dots());
            summary.add_child(plainLabel(`📶 ${state.linkquality}`, mutedStyle));
        }
        if (summary.get_n_children()) wrap.add_child(summary);

        const badges = new St.BoxLayout({ x_expand: true, style: 'spacing: 12px;' });
        const batt = parseInt(state.battery, 10);
        if (Number.isFinite(batt)) {
            const bEmoji = batt < 30 ? '🪫' : '🔋';
            badges.add_child(plainLabel(`${bEmoji} ${batt}%`,
                `color: ${batteryColor(batt)}; font-weight: bold;`));
        }
        const tb = this._tempBadge(state);
        if (tb) badges.add_child(tb);
        const pw = parseFloat(state.power);
        if (Number.isFinite(pw)) {
            badges.add_child(plainLabel(`⚡ ${Math.round(pw)} W`, ''));
        }
        if (badges.get_n_children() > 0) wrap.add_child(badges);

        if (d.type === 'host' && d.ip) {
            const pingRow = new St.BoxLayout({
                x_expand: true, style: 'spacing: 8px; padding-top: 6px;',
            });

            const pingBtn = new St.Button({
                can_focus: true, style_class: 'zigduck-pill',
                style: 'padding: 4px 14px;',
            });
            const pb = new St.BoxLayout({ style: 'spacing: 6px;' });
            pb.add_child(plainLabel('Ping', 'font-weight: bold;'));
            pingBtn.set_child(pb);
            pingBtn.connect('clicked', () => this._pingHost(d));
            pingRow.add_child(pingBtn);

            const res = this._pingResults[d.friendly_name];
            if (res && res.pingedAt && Date.now() - res.pingedAt < 10000) {
                const txt = res.ok
                    ? (res.ms != null ? `✓ ${res.ms.toFixed(1)} ms` : '✓ reachable')
                    : '✗ unreachable';
                pingRow.add_child(plainLabel(txt,
                    `color: ${res.ok ? GREEN : RED}; font-weight: bold; font-size: 0.85em;`));

                if (this._pingHideTimer) GLib.source_remove(this._pingHideTimer);
                this._pingHideTimer = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT,
                    10000 - (Date.now() - res.pingedAt),
                    () => {
                        this._pingHideTimer = 0;
                        this._renderContent();
                        return GLib.SOURCE_REMOVE;
                    });
            }

            pingRow.add_child(new St.Widget({ x_expand: true }));
            wrap.add_child(pingRow);
        }

        const occ = this._occupancyBadge(state);
        if (occ) wrap.add_child(occ);
        const leak = this._leakBadge(state);
        if (leak) wrap.add_child(leak);
        const contact = this._contactBadge(state);
        if (contact) wrap.add_child(contact);

        if (ONOFF_TYPES.has(d.type)) {
            const isOn = state.state === 'ON';
            const off  = isOffline(state);
            let accent = null;
            if (isOn && LIGHT_TYPES.has(d.type) && !off) {
                accent = colorFromState(state);
            }
            wrap.add_child(this._togglePill(isOn, isOn ? 'On' : 'Off',
                () => this._devCmd(d, 'toggle'), accent, off));
        }

        if (state.position !== undefined && !ONOFF_TYPES.has(d.type)) {
            wrap.add_child(this._blindButtons(d, state));
        }

        const isLight = LIGHT_TYPES.has(d.type);
        const hasBrightness = Number.isFinite(parseInt(state.brightness, 10));
        if (isLight || hasBrightness) {
            const rawBri = parseInt(state.brightness, 10);
            const isOn = state.state === 'ON';
            const startValue = !isOn
                ? 0
                : (Number.isFinite(rawBri) ? Math.max(0, Math.min(1, rawBri / 254)) : 1);

            const bRow = new St.BoxLayout({
                x_expand: true, style: 'spacing: 8px; padding-top: 4px;',
            });
            bRow.add_child(new St.Icon({
                icon_name: 'display-brightness-symbolic',
                icon_size: 14, y_align: Clutter.ActorAlign.CENTER,
            }));
            const sl = new Slider.Slider(startValue);
            sl.x_expand = true; sl.y_align = Clutter.ActorAlign.CENTER;
            bRow.add_child(sl);
            const pctLbl = plainLabel(`${Math.round(startValue * 100)}%`,
                'width: 44px; text-align: right; font-size: 0.85em;');
            bRow.add_child(pctLbl);

            sl.connect('notify::value', () => {
                const v = Math.round(sl.value * 254);
                pctLbl.set_text(`${Math.round(sl.value * 100)}%`);
                if (this._detailDebounce) GLib.source_remove(this._detailDebounce);
                this._detailDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                    this._detailDebounce = 0;
                    this._devBrightness(d, v);
                    return GLib.SOURCE_REMOVE;
                });
            });
            wrap.add_child(bRow);
        }

        if (d.supports_color) {
            wrap.add_child(plainLabel('Color', 'font-weight: bold; margin-top: 4px;'));
            const palette = [
                '#FF0000', '#FF8C00', '#FFD700', '#00FF00',
                '#00CED1', '#0000FF', '#8A2BE2', '#FF69B4', '#FFFFFF',
            ];
            const grid = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
            for (const hex of palette) grid.add_child(this._colorSwatch(d, hex, ''));
            grid.add_child(this._colorSwatch(d, null, '?', true));
            wrap.add_child(grid);
        }

        if (d.type === 'remote' || d.type === 'dimmer') {
            const openKey = `buttons:${d.friendly_name}`;
            const isOpen  = !!this._buttonsOpenRooms[openKey];
            wrap.add_child(this._tvCollapsibleHeader('BUTTONS', isOpen, () => {
                this._buttonsOpenRooms[openKey] = !isOpen;
                this._renderContent();
            }));

            if (isOpen) {
                wrap.add_child(plainLabel('No actions defined for this device yet.',
                    'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
            }
        }

        const meta = this._deviceMeta[d.friendly_name] || {};
        const merged = { ...state };
        const candidates = [
            ['ieee',         d.ieee         ?? meta.ieee],
            ['hue_id',       d.hue_id       ?? meta.hue_id],
            ['endpoint',     d.endpoint     ?? meta.endpoint],
            ['battery_type', d.battery_type ?? meta.battery_type],
            ['ip',           d.ip           ?? null],
        ];
        for (const [k, v] of candidates) {
            if (v === null || v === undefined || v === '') continue;
            if (merged[k] === undefined) merged[k] = v;
        }

        const keys = Object.keys(merged);
        if (keys.length) {
            wrap.add_child(plainLabel('Details', 'font-weight: bold; margin-top: 4px;'));


            const isNA = s => /^n\/?a$/i.test(String(s).trim());

            for (const k of keys) {
                const v = merged[k];
                if (v === null || v === undefined) continue;
                if (isNA(v)) continue;

                let nested = null;
                if (typeof v === 'string' && /^\s*[\[{]/.test(v)) {
                    try {
                        const parsed = JSON.parse(v);
                        if (parsed && typeof parsed === 'object') nested = parsed;
                    } catch (_) {}
                }

                if (nested) {
                    const entries = Array.isArray(nested)
                        ? nested.map((item, i) => [i, item])
                        : Object.entries(nested);

                    const filtered = entries.filter(([_subK, subV]) =>
                        !isNA(subV) && subV !== null && subV !== undefined);

                    if (filtered.length === 0) continue;

                    wrap.add_child(plainLabel(k,
                        'opacity: 0.7; font-size: 0.85em; font-weight: bold;'));

                    for (const [subK, subV] of filtered) {
                        const sr = new St.BoxLayout({
                            x_expand: true, style: 'spacing: 8px; padding-left: 16px;',
                        });
                        sr.add_child(plainLabel(String(subK),
                            'opacity: 0.65; font-size: 0.8em; font-family: monospace;'));
                        sr.add_child(new St.Widget({ x_expand: true }));
                        sr.add_child(plainLabel(
                            (subV && typeof subV === 'object')
                                ? JSON.stringify(subV)
                                : String(subV),
                            'font-size: 0.8em; font-family: monospace;'));
                        wrap.add_child(sr);
                    }
                    continue;
                }

                let display = String(v);
                let valueStyle = 'font-size: 0.85em;';

                if (k === 'last_seen') {
                    display = timeAgo(v);
                    valueStyle += ` color: ${offline ? RED : GREEN}; font-weight: bold;`;
                } else if (k === 'last_updated') {
                    const ts = parseInt(v, 10);
                    if (Number.isFinite(ts)) {
                        display = timeAgo(new Date(ts * 1000).toISOString());
                    }
                    valueStyle += ` color: ${offline ? RED : GREEN}; font-weight: bold;`;
                } else if (k === 'battery') {
                    const n = parseInt(v, 10);
                    display = `${v}%`;
                    if (Number.isFinite(n)) valueStyle += ` color: ${batteryColor(n)}; font-weight: bold;`;
                } else if (k === 'occupancy') {
                    display = isTruthy(v) ? 'detected' : 'no motion';
                } else if (k === 'water_leak') {
                    display = isTruthy(v) ? 'LEAK DETECTED!' : 'no leak';
                } else if (k === 'contact') {
                    display = isTruthy(v) ? 'closed' : 'OPEN';
                } else if (typeof display === 'string' && display.length > 48) {
                    display = display.slice(0, 45) + '…';
                }

                const r = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
                r.add_child(plainLabel(k, 'opacity: 0.7; font-size: 0.85em;'));
                r.add_child(new St.Widget({ x_expand: true }));
                r.add_child(plainLabel(display, valueStyle));
                wrap.add_child(r);
            }
        }
        return wrap;
    }

    _isOfflineFor(d, state) {
        if (d && d.type === 'host') {
            const r = this._pingResults[d.friendly_name];
            if (r && typeof r.ok === 'boolean') return !r.ok;
        }
        return isOffline(state);
    }

    _pingRowButton(d) {
        const b = new St.Button({
            can_focus: true, style_class: 'zigduck-pill',
            style: 'padding: 2px 10px;',
        });
        const box = new St.BoxLayout({ style: 'spacing: 5px;' });
        box.add_child(plainLabel('Ping', 'font-size: 0.8em;'));
        b.set_child(box);
        b.connect('clicked', () => this._pingHost(d));
        return b;
    }

    async _pingHost(d) {
        if (!d.ip) {
            this._status.set_text('✗ no ip configured');
            return;
        }
        this._status.set_text(`… ping ${d.ip}`);

        const args = ['-c', '1', '-W', '2', d.ip];
        const candidates = [
            'ping',
            '/run/current-system/sw/bin/ping',
            '/usr/bin/ping',
            '/bin/ping',
        ];

        let lastErr = null;
        for (const bin of candidates) {
            try {
                const out = await runCmd([bin, ...args], 5);
                const m = /time[=<]\s*([\d.]+)\s*ms/.exec(out);
                this._pingResults[d.friendly_name] = {
                    ok: true,
                    ms: m ? parseFloat(m[1]) : null,
                    pingedAt: Date.now(),
                };
                try {
                    await runCli([
                        '--publish',
                        '--topic', `${this._baseTopic}/${d.friendly_name}`,
                        '--payload', JSON.stringify({ last_seen: new Date().toISOString() }),
                    ], 5);
                } catch (_) { }
                this._status.set_text(
                    `● ${d.friendly_name} ${m ? m[1] + ' ms' : 'reachable'}`);
                this._renderContent();
                return;
            } catch (e) {
                const msg = (e && e.message) || '';
                const code = e && e.exitCode;
                if (/Cannot launch/i.test(msg)) {
                    lastErr = e;
                    continue;
                }
                if (code === 1) {
                    this._pingResults[d.friendly_name] = { ok: false, error: msg, pingedAt: Date.now() };
                    this._status.set_text(`✗ ${d.friendly_name} unreachable`);
                } else {
                    this._pingResults[d.friendly_name] = { ok: null, error: msg, pingedAt: Date.now() };
                    this._status.set_text(`✗ ping failed: ${msg}`);
                }
                this._renderContent();
                return;
            }
        }

        const errMsg = lastErr ? lastErr.message : 'not found';
        this._pingResults[d.friendly_name] = { ok: null, error: errMsg, pingedAt: Date.now() };
        this._status.set_text('✗ ping binary not found — add iputils to systemPackages');
        this._renderContent();
    }


    async _devCmd(device, state) {
        const key = device.friendly_name;
        if (this._busy.has(key)) return;
        this._busy.add(key);
        this._status.set_text(`… ${key} ${state}`);
        try {
            await runCli(['--device', key, '--state', state]);
            const cur = (this._states[key] || {}).state;
            const next = state === 'toggle' ? (cur === 'ON' ? 'OFF' : 'ON')
                       : state === 'on' ? 'ON'
                       : state === 'off' ? 'OFF'
                       : cur;
            this._states[key] = { ...(this._states[key] || {}), state: next };
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        } finally {
            this._busy.delete(key);
        }
    }

    async _devBrightness(device, value) {
        const key = device.friendly_name;
        this._status.set_text(`… ${key} brightness ${value}`);
        try {
            await runCli(['--device', key, '--brightness', String(value)]);
            this._states[key] = { ...(this._states[key] || {}), brightness: String(value) };
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    async _devColor(device, hex) {
        const key = device.friendly_name;
        this._status.set_text(`… ${key} → ${hex}`);
        try {
            await runCli(['--device', key, '--color', hex]);

            this._states[key] = {
                ...(this._states[key] || {}),
                state: 'ON',
                color: JSON.stringify({ hex }),
            };
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                this._refresh().then(() => {
                    if (this._detailDevice) {
                        const fresh = this._devices.find(
                            d => d.friendly_name === this._detailDevice.friendly_name);
                        if (fresh) this._detailDevice = fresh;
                    }
                    return GLib.SOURCE_REMOVE;
                });
                return GLib.SOURCE_REMOVE;
            });
        } catch (e) { this._status.set_text('✗ ' + (e.message || '').slice(0, 45)); }
    }

    async _roomCmd(room, state) {
        this._status.set_text(`… ${room} ${state}`);
        try {
            await runCli(['--room', room, '--state', state]);
            for (const d of this._devices) {
                if ((d.room || 'other') === room && ONOFF_TYPES.has(d.type)) {
                    const cur = (this._states[d.friendly_name] || {}).state;
                    const next = state === 'toggle' ? (cur === 'ON' ? 'OFF' : 'ON')
                               : state === 'on' ? 'ON'
                               : state === 'off' ? 'OFF'
                               : cur;
                    this._states[d.friendly_name] = {
                        ...(this._states[d.friendly_name] || {}),
                        state: next,
                    };
                }
            }
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    async _runScene(name) {
        this._status.set_text(`… ✦ ${name}`);
        try {
            await runCli(['--scene', name]);
            this._status.set_text('● done');
        } catch (e) { this._status.set_text('✗ ' + (e.message || '').slice(0, 45)); }
    }

    destroy() {
        this._alive = false;
        this._unloadSceneStylesheet();
        if (this._sliderDebounce) {
            GLib.source_remove(this._sliderDebounce);
            this._sliderDebounce = 0;
        }
        if (this._detailDebounce) {
            GLib.source_remove(this._detailDebounce);
            this._detailDebounce = 0;
        }
        if (this._pingHideTimer) {
            GLib.source_remove(this._pingHideTimer);
            this._pingHideTimer = 0;
        }
        super.destroy();
    }
});

export default class ZigduckExtension extends Extension {
    enable() {
        try {
            this._indicator = new ZigduckIndicator();
        } catch (e) {
            logError(e, 'Zigduck: indicator construction failed');
            this._indicator = this._makeErrorIndicator(e);
        }
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }
    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
    _makeErrorIndicator(err) {
        const btn = new PanelMenu.Button(0.0, 'Zigduck');
        btn.add_child(new St.Icon({
            icon_name: 'dialog-error-symbolic',
            style_class: 'system-status-icon',
        }));
        const item = new PopupMenu.PopupMenuItem(
            `Zigduck failed to load:\n${err.message}`
        );
        item.reactive = false;
        btn.menu.addMenuItem(item);
        return btn;
    }
}
