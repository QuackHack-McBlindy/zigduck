import St     from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main      from 'resource:///org/gnome/shell/ui/main.js';

import ZigduckIndicator from './indicator.js';

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
