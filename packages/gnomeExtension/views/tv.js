import GLib    from 'gi://GLib';
import Gio     from 'gi://Gio';
import St      from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import { GREEN, ROOM_ON_COLOR } from '../constants.js';
import { plainLabel, mdiIcon } from '../icons.js';
import { parseEpgTime, fmtHHMM } from '../utils.js';
import { runCmd } from '../cli.js';
import { togglePill, tvCollapsibleHeader } from '../widgets.js';


export function renderTvGuideView(indicator) {
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
        indicator._tvView = false;
        indicator._settingsView = true;
        indicator._updateToolbarState();
        indicator._renderContent();
    });
    navRow.add_child(back);
    navRow.add_child(new St.Widget({ x_expand: true }));

    const scrapeBtn = new St.Button({
        can_focus: true, style_class: 'zigduck-icon-btn',
    });
    scrapeBtn.set_child(mdiIcon('shovel', 14));
    scrapeBtn.connect('clicked', async () => {
        indicator._status.set_text('… running tv-scraper');
        try {
            await runCmd([
                'tv-scraper',
                '--json-out', `${GLib.get_home_dir()}/.local/share/zigduck/epg.json`,
            ], 120);
            indicator._status.set_text('● scraper done');
            await indicator._loadTvGuide();
        } catch (e) {
            indicator._status.set_text('✗ ' + (e.message || 'scraper failed').slice(0, 60));
        }
        indicator._renderContent();
    });
    navRow.add_child(scrapeBtn);

    const refreshBtn = new St.Button({
        can_focus: true, style_class: 'zigduck-icon-btn',
    });
    refreshBtn.set_child(new St.Icon({
        icon_name: 'view-refresh-symbolic', icon_size: 14,
    }));
    refreshBtn.connect('clicked', async () => {
        indicator._status.set_text('… reloading EPG');
        await indicator._loadTvGuide();
        indicator._status.set_text('● done');
        indicator._renderContent();
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

    if (!indicator._tvData || !Array.isArray(indicator._tvData.channels)
        || !indicator._tvData.channels.length) {
        outer.add_child(plainLabel('No EPG data. Check epg.json.',
            'opacity: 0.6; padding: 12px;'));
        return outer;
    }

    const listBox = new St.BoxLayout({
        vertical: true, x_expand: true, style: 'spacing: 6px;',
    });

    const now = new Date();
    const icons = indicator._tvIcons || {};

    const sortedChannels = [...indicator._tvData.channels].sort((a, b) => {
        const na = Number(a.id);
        const nb = Number(b.id);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a.id).localeCompare(String(b.id));
    });

    for (const ch of sortedChannels) {
        listBox.add_child(tvChannelCard(ch, now, icons));
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

function tvChannelCard(ch, now, icons) {
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

    if (current) card.add_child(tvProgramRow(current, true));
    for (const p of upcoming) card.add_child(tvProgramRow(p, false));
    return card;
}

function tvProgramRow(p, isCurrent) {
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


export function renderTvDetail(indicator, tv) {
    const st = indicator._tvGetState(tv.tvKey);
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
    const powerBtn = togglePill(
        st.power,
        st.power ? 'On' : 'Off',
        async () => {
            st.power = !st.power;
            indicator._renderContent();
            await indicator._tvSend(tv, st.power ? 'on' : 'off');
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
    findBtn.connect('clicked', () => indicator._tvSend(tv, 'call'));
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
            indicator._tvFlushVolume(tv, st, targetVol);
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
        b.connect('clicked', () => indicator._tvSend(tv, typ));
        return b;
    };
    transportRow.add_child(mkTransport('⏮', 'prev'));
    transportRow.add_child(mkTransport('⏯', 'pause'));
    transportRow.add_child(mkTransport('⏭', 'next'));
    wrap.add_child(transportRow);

    wrap.add_child(tvCollapsibleHeader(
        'CHANNELS', st.channelsOpen, () => {
            st.channelsOpen = !st.channelsOpen;
            indicator._renderContent();
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
        epgBtn.connect('clicked', () => indicator._openTvGuide());
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
                        indicator._status.set_text(
                            `📺 channel ${ch.id ?? ch.key} — needs yo wrapper`);
                    });
                    row.add_child(btn);
                }
                grid.add_child(row);
            }
            wrap.add_child(grid);
        }
    }

    wrap.add_child(tvCollapsibleHeader(
        'BUTTONS', st.remoteOpen, () => {
            st.remoteOpen = !st.remoteOpen;
            indicator._renderContent();
        },
    ));

    if (st.remoteOpen) {
        wrap.add_child(tvRemotePanel(indicator, tv));
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

function tvRemotePanel(indicator, tv) {
    const wrap = new St.BoxLayout({
        vertical: true, x_expand: true, style: 'spacing: 8px;',
    });

    const send = (typ) => indicator._tvSend(tv, typ);

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
