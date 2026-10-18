import St      from 'gi://St';
import GLib    from 'gi://GLib';
import Pango   from 'gi://Pango';

import { plainLabel } from '../icons.js';

export function renderChatView(indicator) {
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
        indicator._chatActive   = false;
        indicator._chatMessages = [];
        indicator._renderContent();
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
    for (const m of indicator._chatMessages) {
        list.add_child(chatBubble(m.role, m.text, {
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

function chatBubble(role, text, meta = {}) {
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
