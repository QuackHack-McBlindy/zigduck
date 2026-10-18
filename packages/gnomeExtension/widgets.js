import St      from 'gi://St';
import Clutter from 'gi://Clutter';

import {
    ONOFF_TYPES,
    LIGHT_TYPES,
    ROOM_ON_COLOR,
    SYNC_ACCENT,
    GREEN,
    RED,
} from './constants.js';

import {
    hexToRgb01,
    rgbToHex01,
    colorFromState,
    isOffline,
    batteryColor,
    isTruthy,
    randomHex,
} from './utils.js';

import { plainLabel } from './icons.js';


export function buildGradientStrip(palette, steps = 24) {
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

export function makeColorContent(colors) {
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

export function togglePill(isOn, labelText, onClick, accentColor = null, muteGlow = false, glow = false) {
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

export function tvCollapsibleHeader(label, isOpen, onToggle) {
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

export function sectionHeader(title, onAdd) {
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

export function sparkline(history, color) {
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

export function batteryBadge(state) {
    const b = parseInt(state.battery, 10);
    if (!Number.isFinite(b)) return null;
    return plainLabel(`${b}%`,
        `color: ${batteryColor(b)}; font-weight: bold; `
      + `font-size: 0.85em; width: 40px; text-align: right;`);
}

export function tempBadge(state) {
    for (const [k, v] of Object.entries(state)) {
        if (!/temp/i.test(k)) continue;
        const t = parseFloat(v);
        if (!Number.isFinite(t)) continue;
        return plainLabel(`${t.toFixed(1)}°C`,
            'opacity: 0.8; font-size: 0.85em; width: 54px; text-align: right;');
    }
    return null;
}

export function powerBadge(state) {
    const p = parseFloat(state.power);
    if (!Number.isFinite(p)) return null;
    return plainLabel(`${Math.round(p)} W`,
        'opacity: 0.8; font-size: 0.85em; width: 50px; text-align: right;');
}

export function occupancyBadge(state) {
    if (state.occupancy === undefined) return null;
    const detected = isTruthy(state.occupancy);
    return plainLabel(detected ? 'DETECTED' : 'no motion',
        `color: ${detected ? GREEN : RED}; font-weight: bold; font-size: 0.8em;`);
}

export function leakBadge(state) {
    if (state.water_leak === undefined) return null;
    const leaking = isTruthy(state.water_leak);
    return plainLabel(leaking ? 'LEAK DETECTED!' : 'no leak',
        `color: ${leaking ? RED : GREEN}; font-weight: bold; font-size: 0.8em;`);
}

export function contactBadge(state) {
    if (state.contact === undefined) return null;
    const closed = isTruthy(state.contact);
    return plainLabel(closed ? 'closed' : 'OPEN',
        `color: ${closed ? GREEN : RED}; font-weight: bold; font-size: 0.8em;`);
}

export function buildBellWithBadge(count) {
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


export function blindButtons(indicator, device, state) {
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
    box.add_child(mk('▲', upOn,   () => indicator._devCmd(device, 'on')));
    box.add_child(mk('▼', downOn, () => indicator._devCmd(device, 'off')));
    return box;
}

export function colorSwatch(indicator, device, hex, char = '', isRandom = false) {
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
        if (isRandom) indicator._devColor(device, randomHex());
        else          indicator._devColor(device, hex);
    });
    return b;
}

export function pingRowButton(indicator, d) {
    const b = new St.Button({
        can_focus: true, style_class: 'zigduck-pill',
        style: 'padding: 2px 10px;',
    });
    const box = new St.BoxLayout({ style: 'spacing: 5px;' });
    box.add_child(plainLabel('Ping', 'font-size: 0.8em;'));
    b.set_child(box);
    b.connect('clicked', () => indicator._pingHost(d));
    return b;
}

export function stateControl(indicator, d, state) {
    const occ = occupancyBadge(state);
    if (occ) return occ;

    const leak = leakBadge(state);
    if (leak) return leak;

    const contact = contactBadge(state);
    if (contact) return contact;

    if (state.position !== undefined && !ONOFF_TYPES.has(d.type)) {
        return blindButtons(indicator, d, state);
    }

    if (d.type === 'tv') {
        const st = indicator._tvGetState(d.tvKey);
        return togglePill(st.power, st.power ? 'On' : 'Off',
            () => indicator._tvToggleFromList(d),
            st.power ? ROOM_ON_COLOR : null);
    }

    if (d.type === 'host' && d.ip) {
        return pingRowButton(indicator, d);
    }

    if (ONOFF_TYPES.has(d.type)) {
        const syncActive = indicator._syncIsOn()
                        && indicator._roomIsEntertainment(d.room);

        const isOn = syncActive || state.state === 'ON';
        const off  = !syncActive && isOffline(state);

        let accent = null;
        if (syncActive) {
            accent = SYNC_ACCENT;
        } else if (isOn && LIGHT_TYPES.has(d.type) && !off) {
            accent = colorFromState(state);
        }

        const onClick = syncActive
            ? () => { indicator._status.set_text('🟣 sync active — use the sync panel'); }
            : () => indicator._devCmd(d, 'toggle');

        return togglePill(
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

export function updateBellBadge(indicator, count) {
    if (!indicator._bellBtn) return;
    indicator._bellBtn.set_child(buildBellWithBadge(count));
}

export function updateToolbarState(indicator) {
    if (indicator._gearBtn) {
        indicator._gearBtn.style_class = 'zigduck-icon-btn'
            + (indicator._settingsView ? ' zigduck-icon-btn-active' : '');
    }
    if (indicator._bellBtn) {
        indicator._bellBtn.style_class = 'zigduck-icon-btn'
            + (indicator._notifyView ? ' zigduck-icon-btn-active' : '');
    }
}
