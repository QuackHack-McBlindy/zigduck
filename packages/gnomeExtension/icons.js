import Gio     from 'gi://Gio';
import St      from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango   from 'gi://Pango';

import { FA_EMOJI, MDI_EMOJI } from './constants.js';
import { extensionDir } from './utils.js';

export function plainLabel(text, style = '') {
    const lbl = new St.Label({ text: String(text), style });
    if (lbl.clutter_text) lbl.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    return lbl;
}

export function faIcon(faName, size = 16) {
    if (!faName) return plainLabel('▫',
        `width: ${size + 4}px; text-align: center; opacity: 0.7;`);
    const m = /fa-[a-z0-9-]+/.exec(String(faName));
    const key = m ? m[0] : null;
    const emoji = key && FA_EMOJI[key] ? FA_EMOJI[key] : '▫';
    return plainLabel(emoji,
        `width: ${size + 4}px; text-align: center; font-size: ${size - 1}px;`);
}

export function zigduckIcon(size = 16) {
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

export function mdiIcon(mdiName, size = 16) {
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
