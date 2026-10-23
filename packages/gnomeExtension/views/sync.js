import GLib    from 'gi://GLib';
import St      from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import { SYNC_ACCENT } from '../constants.js';
import { plainLabel, mdiIcon } from '../icons.js';
import { togglePill } from '../widgets.js';

export function renderSyncSection(indicator) {
    const room = indicator._selectedRoom;
    const sync = indicator._getSync(room);

    const liveOn        = indicator._syncIsOn();
    const liveModeCli   = indicator._syncLiveMode();
    const liveModeUi    = indicator._syncCliModeToUi(liveModeCli);
    const liveIntensity = indicator._syncLiveIntensityUi();
    const liveBrightness = Math.max(0, Math.min(100,
        Number(indicator._syncStatus?.brightness ?? 0)));
    const liveHdmi      = indicator._syncStatus?.hdmiSource || null;

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
        indicator._renderContent();
    });
    headerRow.add_child(titleBtn);

    headerRow.add_child(new St.Widget({ x_expand: true }));

    const toggle = togglePill(liveOn, liveOn ? 'On' : 'Off', () => {
        if (liveOn) indicator._syncOff(); else indicator._syncOn();
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
        b.connect('clicked', () => indicator._syncSetModeUi(ui));
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
        b.connect('clicked', () => indicator._syncSetIntensityUi(lvl));
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
        if (indicator._syncDebounce) GLib.source_remove(indicator._syncDebounce);
        indicator._syncDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            indicator._syncDebounce = 0;
            indicator._syncSetBrightness(v);
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
        b.connect('clicked', () => indicator._syncSetHdmiInput(i));
        hdmiRow.add_child(b);
    }
    hdmiRow.add_child(new St.Widget({ x_expand: true }));
    wrap.add_child(hdmiRow);

    return wrap;
}
