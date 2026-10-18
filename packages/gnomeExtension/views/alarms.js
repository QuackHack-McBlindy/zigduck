import St      from 'gi://St';
import Clutter from 'gi://Clutter';

import { RED } from '../constants.js';
import { mdiIcon, plainLabel } from '../icons.js';
import { sectionHeader, togglePill } from '../widgets.js';

export function renderAlarmsView(indicator) {
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
        indicator._alarmsView = false;
        indicator._settingsView = true;
        indicator._updateToolbarState();
        indicator._renderContent();
    });
    backRow.add_child(back);
    backRow.add_child(new St.Widget({ x_expand: true }));
    wrap.add_child(backRow);

    wrap.add_child(alarmsSection(indicator));
    wrap.add_child(timersSection(indicator));
    return wrap;
}

function alarmsSection(indicator) {
    const sec = new St.BoxLayout({
        vertical: true, x_expand: true, style: 'spacing: 4px;',
    });
    sec.add_child(sectionHeader('ALARMS', () => {
        indicator._status.set_text('⏰ add alarm: not implemented');
    }));

    if (!indicator._alarms.length) {
        sec.add_child(plainLabel('No alarms.',
            'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
        return sec;
    }

    for (const a of indicator._alarms) {
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
        const pill = togglePill(on, on ? 'On' : 'Off', () => {
            indicator._toggleAlarm(a);
        });
        row.add_child(pill);

        const rm = new St.Button({
            can_focus: true, style_class: 'zigduck-icon-btn',
        });
        rm.set_child(new St.Icon({
            icon_name: 'user-trash-symbolic', icon_size: 12,
            style: `color: ${RED};`,
        }));
        rm.connect('clicked', () => indicator._removeAlarm(a));
        row.add_child(rm);

        sec.add_child(row);
    }
    return sec;
}

function timersSection(indicator) {
    const sec = new St.BoxLayout({
        vertical: true, x_expand: true, style: 'spacing: 4px; padding-top: 6px;',
    });
    sec.add_child(sectionHeader('TIMERS', () => {
        indicator._status.set_text('⏱ add timer: not implemented');
    }));

    if (!indicator._timers.length) {
        sec.add_child(plainLabel('No timers.',
            'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
        return sec;
    }

    for (const t of indicator._timers) {
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
        rm.connect('clicked', () => indicator._cancelTimer(t));
        row.add_child(rm);

        sec.add_child(row);
    }
    return sec;
}
