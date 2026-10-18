import St      from 'gi://St';
import Clutter from 'gi://Clutter';

import {
    ROOM_EMOJI,
    ROOM_ON_COLOR,
    ROOM_SYNC_COLOR,
    LIGHT_TYPES,
} from '../constants.js';
import { plainLabel, mdiIcon } from '../icons.js';
import { slugify, isOffline } from '../utils.js';

function roomIconFor(indicator, roomName) {
    const meta = indicator._roomMeta;
    if (!meta) return null;
    if (meta[roomName] && meta[roomName].icon) return meta[roomName].icon;
    const lower = roomName.toLowerCase();
    if (meta[lower] && meta[lower].icon) return meta[lower].icon;
    const slug = slugify(roomName);
    for (const [k, v] of Object.entries(meta)) {
        if (slugify(k) === slug && v.icon) return v.icon;
    }
    return null;
}

function roomHasLightOn(indicator, room) {
    for (const d of indicator._devices) {
        if ((d.room || 'other') !== room) continue;
        if (!LIGHT_TYPES.has(d.type)) continue;
        const st = indicator._states[d.friendly_name] || {};
        if (st.state === 'ON' && !isOffline(st)) return true;
    }
    return false;
}

export function renderRooms(indicator) {
    indicator._roomsRow.destroy_all_children();
    indicator._roomButtons.clear();

    for (const room of indicator._rooms) {
        const iconName = roomIconFor(indicator, room);
        const btn = new St.Button({
            can_focus: true, style_class: 'zigduck-room-circle',
        });
        const child = iconName ? mdiIcon(iconName, 20)
            : plainLabel(ROOM_EMOJI[room] || '🏠', 'text-align: center;');
        child.x_expand = true; child.y_expand = true;
        const baseStyle = (typeof child.get_style === 'function' ? child.get_style() : '') || '';
        btn.set_child(child);
        btn.connect('clicked', () => {
            indicator._selectedRoom = (indicator._selectedRoom === room) ? null : room;
            indicator._detailDevice = null;
            indicator._detailCard   = null;
            indicator._sceneDraft   = null;
            indicator._chatActive   = false;
            indicator._chatMessages = [];
            indicator._settingsView = false;
            indicator._notifyView   = false;
            indicator._alarmsView   = false;
            indicator._updateToolbarState();
            indicator._updateRoomSelection();
            indicator._renderContent();
        });
        indicator._roomsRow.add_child(btn);
        indicator._roomButtons.set(room, { btn, child, baseStyle });
    }
    updateRoomSelection(indicator);
}

export function updateRoomSelection(indicator) {
    for (const [room, entry] of indicator._roomButtons) {
        const { btn, child, baseStyle } = entry;
        const sel      = room === indicator._selectedRoom;
        const syncOn   = indicator._syncIsOn() && indicator._roomIsEntertainment(room);
        const lightOn  = roomHasLightOn(indicator, room);

        btn.style_class = 'zigduck-room-circle'
            + (sel ? ' zigduck-room-circle-selected' : '');

        if (syncOn && !sel) {
            btn.set_style(
                `border: 3px solid ${ROOM_SYNC_COLOR}; ` +
                `background-color: rgba(139, 92, 246, 0.45);`
            );
        } else {
            btn.set_style(null);
        }

        if (child && typeof child.set_style === 'function') {
            let tint = '';
            if (syncOn)         tint = ROOM_SYNC_COLOR;
            else if (lightOn)   tint = ROOM_ON_COLOR;
            if (tint && !sel) child.set_style(baseStyle + ` color: ${tint};`);
            else              child.set_style(baseStyle);
        }
    }
}
