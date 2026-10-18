import St     from 'gi://St';
import Gio    from 'gi://Gio';
import Clutter from 'gi://Clutter';

import { zigduckIcon, mdiIcon, plainLabel } from '../icons.js';

export function renderSettingsView(indicator) {
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
        indicator._settingsView = false;
        indicator._updateToolbarState();
        indicator._renderContent();
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
    alarmsBtn.connect('clicked', () => indicator._openAlarmsView());
    wrap.add_child(alarmsBtn);

    const items = [
        { label: 'Media',         icon: 'multimedia-player-symbolic',
          url: null },
        { label: 'TV-Guide',      icon: 'applications-multimedia-symbolic',
          url: null,
          onOpen: () => indicator._openTvGuide() },
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
                    indicator._status.set_text(`🌐 ${item.url}`);
                } catch (e) {
                    indicator._status.set_text('✗ cannot open browser');
                    logError(e, 'Zigduck: launch_default_for_uri failed');
                }
            } else {
                indicator._status.set_text(`⚙ ${item.label}: not implemented`);
            }
        });
        wrap.add_child(btn);
    }
    return wrap;
}
