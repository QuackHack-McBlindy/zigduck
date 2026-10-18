import St     from 'gi://St';
import Pango  from 'gi://Pango';

import { RED } from '../constants.js';
import { plainLabel } from '../icons.js';
import { formatNotifyTime } from '../utils.js';

export function renderNotifyView(indicator) {
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
        indicator._notifyView = false;
        indicator._updateToolbarState();
        indicator._renderContent();
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
    trashBtn.connect('clicked', () => indicator._clearNotifications());
    titleRow.add_child(trashBtn);
    wrap.add_child(titleRow);

    const list = [...indicator._notifications].reverse();
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
