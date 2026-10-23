import St      from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib    from 'gi://GLib';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import {
    ONOFF_TYPES,
    LIGHT_TYPES,
    GREEN,
    RED,
} from '../constants.js';

import { mdiIcon, plainLabel } from '../icons.js';

import {
    isOffline,
    isTruthy,
    lastSeenMs,
    batteryColor,
    colorFromState,
    timeAgo,
} from '../utils.js';

import {
    batteryBadge,
    tempBadge,
    powerBadge,
    occupancyBadge,
    leakBadge,
    contactBadge,
    blindButtons,
    colorSwatch,
    togglePill,
    tvCollapsibleHeader,
    stateControl,
} from '../widgets.js';

export function isOfflineFor(indicator, d, state) {
    if (d && d.type === 'host') {
        const r = indicator._pingResults[d.friendly_name];
        if (r && typeof r.ok === 'boolean') return !r.ok;
    }
    return isOffline(state);
}

function renderControl(indicator, device, key, ctl, currentValue) {
    const row = new St.BoxLayout({
        x_expand: true, style: 'spacing: 8px; padding: 3px 0;',
    });

    if (ctl.icon) {
        row.add_child(mdiIcon(ctl.icon, 16));
    } else {
        row.add_child(new St.Widget({ style: 'width: 20px;' }));
    }

    row.add_child(plainLabel(key,
        'opacity: 0.75; font-size: 0.9em; min-width: 140px;'));

    if (ctl.type === 'sensor') {
        row.add_child(new St.Widget({ x_expand: true }));
        row.add_child(plainLabel(formatSensorDisplay(key, currentValue),
            'font-size: 0.9em; font-weight: bold;'));
        return row;
    }

    const hasValues = Array.isArray(ctl.values) && ctl.values.length > 0;


    if (ctl.type === 'bool') {
        const hasValueList = Array.isArray(ctl.values) && ctl.values.length === 2;
        const isOn = hasValueList
            ? String(currentValue) === String(ctl.values[0])
            : isTruthy(currentValue);
        const onPayload  = hasValueList ? String(ctl.values[0]) : true;
        const offPayload = hasValueList ? String(ctl.values[1]) : false;

        const pill = togglePill(
            isOn,
            isOn ? 'On' : 'Off',
            () => {
                indicator._setControl(device, key, ctl, isOn ? offPayload : onPayload);
            },
            isOn ? GREEN : null,
        );
        row.add_child(pill);
    } else if (ctl.type === 'slider') {
        const dKey = `${device.friendly_name}:${key}`;

        const schedule = (payload) => {
            const prev = indicator._controlDebounces.get(dKey);
            if (prev) GLib.source_remove(prev);
            const tid = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                indicator._controlDebounces.delete(dKey);
                indicator._setControl(device, key, ctl, payload);
                return GLib.SOURCE_REMOVE;
            });
            indicator._controlDebounces.set(dKey, tid);
        };

        if (hasValues) {
            const values  = ctl.values.map(String);
            const curStr  = String(currentValue ?? '');
            const curIdx  = values.indexOf(curStr);
            const start   = curIdx >= 0 ? curIdx : 0;
            const startFrac = values.length > 1 ? start / (values.length - 1) : 0;

            const sl = new Slider.Slider(startFrac);
            sl.x_expand = true;
            sl.y_align = Clutter.ActorAlign.CENTER;
            row.add_child(sl);
            const valLbl = plainLabel(
                curIdx >= 0 ? values[curIdx] : '—',
                'width: 90px; text-align: right; font-size: 0.9em;',
            );
            row.add_child(valLbl);
            sl.connect('notify::value', () => {
                const step = values.length > 1
                    ? Math.round(sl.value * (values.length - 1))
                    : 0;
                const chosen = values[step];
                valLbl.set_text(chosen);
                schedule(chosen);
            });

        } else {
            const min = ctl.min ?? 0;
            const max = ctl.max ?? 100;
            const cur = parseInt(currentValue, 10);
            const startVal = Number.isFinite(cur) && max > min
                ? Math.max(0, Math.min(1, (cur - min) / (max - min)))
                : 0;

            const sl = new Slider.Slider(startVal);
            sl.x_expand = true;
            sl.y_align = Clutter.ActorAlign.CENTER;
            row.add_child(sl);

            const valLbl = plainLabel(
                Number.isFinite(cur) ? String(cur) : '—',
                'width: 50px; text-align: right; font-size: 0.9em;',
            );
            row.add_child(valLbl);

            sl.connect('notify::value', () => {
                const v = Math.round(min + sl.value * (max - min));
                valLbl.set_text(String(v));
                schedule(v);
            });
        }
    }

    row.add_child(new St.Widget({ x_expand: true }));
    return row;
}

function formatSensorDisplay(key, value) {
    if (value === undefined || value === null || value === '') return '—';

    if (value === true  || value === 'true')  return 'yes';
    if (value === false || value === 'false') return 'no';

    const str = String(value);

    if (key === 'battery' || /battery_percent/i.test(key)) {
        const n = parseFloat(str);
        if (Number.isFinite(n)) return `${n}%`;
    }

    if (/battery_voltage|^voltage$/i.test(key)) {
        const n = parseFloat(str);
        if (Number.isFinite(n)) return `${n} mV`;
    }

    if (/temp(erature)?$/i.test(key)) {
        const n = parseFloat(str);
        if (Number.isFinite(n)) return `${n.toFixed(1)}°C`;
    }

    if (key === 'rssi' || /wifi_signal/i.test(key)) {
        const n = parseInt(str, 10);
        if (Number.isFinite(n)) return `${n} dBm`;
    }

    if (/cpu_freq|cpu_speed/i.test(key)) {
        const n = parseInt(str, 10);
        if (Number.isFinite(n)) return `${n} MHz`;
    }

    return str;
}

export function renderDeviceRow(indicator, d) {
    const state = indicator._states[d.friendly_name] || {};
    const offline = isOfflineFor(indicator, d, state);
    const syncActive = indicator._syncIsOn()
                    && indicator._roomIsEntertainment(d.room)
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
        indicator._detailDevice = d;
        indicator._renderContent();
        return Clutter.EVENT_STOP;
    });

    row.add_child(mdiIcon(d.icon, 16));
    if (offline) {
        row.add_child(plainLabel('⚠️', 'font-size: 0.9em;'));
    }
    row.add_child(plainLabel(d.friendly_name,
        offline ? 'color: #f39c12; font-weight: bold;' : ''));

    row.add_child(new St.Widget({ x_expand: true }));

    const b = batteryBadge(state);
    if (b) row.add_child(b);
    const t = tempBadge(state);
    if (t) row.add_child(t);
    const p = powerBadge(state);
    if (p) row.add_child(p);
    const ctrl = stateControl(indicator, d, state);
    if (ctrl) row.add_child(ctrl);

    return row;
}

export function renderDeviceDetail(indicator, d) {
    const state = indicator._states[d.friendly_name] || {};
    const offline = isOfflineFor(indicator, d, state);
    const isHouseDevice = String(d.id || '').startsWith('house:');

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
        indicator._detailDevice = null;
        indicator._renderContent();
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
    const tb = tempBadge(state);
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
        pingBtn.connect('clicked', () => indicator._pingHost(d));
        pingRow.add_child(pingBtn);

        const res = indicator._pingResults[d.friendly_name];
        if (res && res.pingedAt && Date.now() - res.pingedAt < 10000) {
            const txt = res.ok
                ? (res.ms != null ? `✓ ${res.ms.toFixed(1)} ms` : '✓ reachable')
                : '✗ unreachable';
            pingRow.add_child(plainLabel(txt,
                `color: ${res.ok ? GREEN : RED}; font-weight: bold; font-size: 0.85em;`));

            if (indicator._pingHideTimer) GLib.source_remove(indicator._pingHideTimer);
            indicator._pingHideTimer = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                10000 - (Date.now() - res.pingedAt),
                () => {
                    indicator._pingHideTimer = 0;
                    indicator._renderContent();
                    return GLib.SOURCE_REMOVE;
                });
        }

        pingRow.add_child(new St.Widget({ x_expand: true }));
        wrap.add_child(pingRow);
    }

    const occ = occupancyBadge(state);
    if (occ) wrap.add_child(occ);
    const leak = leakBadge(state);
    if (leak) wrap.add_child(leak);
    const contact = contactBadge(state);
    if (contact) wrap.add_child(contact);

    if (ONOFF_TYPES.has(d.type)) {
        const isOn = state.state === 'ON';
        const off  = isOffline(state);
        let accent = null;
        if (isOn && LIGHT_TYPES.has(d.type) && !off) {
            accent = colorFromState(state);
        }
        wrap.add_child(togglePill(isOn, isOn ? 'On' : 'Off',
            () => indicator._devCmd(d, 'toggle'), accent, off));
    }

    if (state.position !== undefined && !ONOFF_TYPES.has(d.type)) {
        wrap.add_child(blindButtons(indicator, d, state));
    }

    const isLight = LIGHT_TYPES.has(d.type);
    const hasBrightness = Number.isFinite(parseInt(state.brightness, 10));
    if (!isHouseDevice && (isLight || hasBrightness)) {
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
            if (indicator._detailDebounce) GLib.source_remove(indicator._detailDebounce);
            indicator._detailDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                indicator._detailDebounce = 0;
                indicator._devBrightness(d, v);
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
        for (const hex of palette) grid.add_child(colorSwatch(indicator, d, hex, ''));
        grid.add_child(colorSwatch(indicator, d, null, '?', true));
        wrap.add_child(grid);
    }

    if (d.type === 'remote' || d.type === 'dimmer') {
        const openKey = `buttons:${d.friendly_name}`;
        const isOpen  = !!indicator._buttonsOpenRooms[openKey];
        wrap.add_child(tvCollapsibleHeader('BUTTONS', isOpen, () => {
            indicator._buttonsOpenRooms[openKey] = !isOpen;
            indicator._renderContent();
        }));

        if (isOpen) {
            wrap.add_child(plainLabel('No actions defined for this device yet.',
                'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
        }
    }

    if (d.controls && Object.keys(d.controls).length > 0) {
        wrap.add_child(plainLabel('Controls',
            'font-weight: bold; margin-top: 8px;'));
        for (const [key, ctl] of Object.entries(d.controls)) {
            wrap.add_child(renderControl(indicator, d, key, ctl, state[key]));
        }
    }

    const meta = indicator._deviceMeta[d.friendly_name] || {};
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
