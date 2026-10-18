import GObject  from 'gi://GObject';
import Gio      from 'gi://Gio';
import GLib     from 'gi://GLib';
import St       from 'gi://St';
import Clutter  from 'gi://Clutter';
import Pango    from 'gi://Pango';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider    from 'resource:///org/gnome/shell/ui/slider.js';

import {
    ONOFF_TYPES,
    LIGHT_TYPES,
    ROOM_ORDER,
} from './constants.js';

import {
    runCli,
    runCmd,
    cleanCliOutput,
    parseYoBlock,
} from './cli.js';

import {
    extensionDir,
    sortDevices,
    isOffline,
    resolvePath,
    slugify,
} from './utils.js';

import {
    plainLabel,
    zigduckIcon,
} from './icons.js';

import {
    buildBellWithBadge,
    updateBellBadge,
    updateToolbarState,
    togglePill,
} from './widgets.js';

import {
    loadScenes,
    loadRoomMeta,
    loadDeviceMeta,
    loadBaseTopic,
    loadHouseDevices,
    loadTvs,
    loadTvIcons,
} from './config.js';

import {
    reloadSceneStylesheet,
    unloadSceneStylesheet,
} from './scene-styles.js';

import { renderRooms, updateRoomSelection }     from './views/rooms.js';
import { renderSyncSection }                    from './views/sync.js';
import { renderSettingsView }                   from './views/settings.js';
import { renderAlarmsView }                     from './views/alarms.js';
import { renderNotifyView }                     from './views/notify.js';
import { renderChatView }                       from './views/chat.js';
import { renderSceneBtn, renderSceneDraft }     from './views/scenes.js';
import { renderCardsSection, renderCardDetail } from './views/cards.js';
import { renderDeviceRow, renderDeviceDetail }  from './views/devices.js';
import { renderTvDetail, renderTvGuideView }    from './views/tv.js';

const ZigduckIndicator = GObject.registerClass(
class ZigduckIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Zigduck'));

        this._alive         = true;
        this._buttonsOpenRooms = {};
        this._devices       = [];
        this._states        = {};
        this._notifications = [];
        this._scenes        = [];
        this._sceneColors   = {};
        this._sceneDark     = {};
        this._roomMeta      = {};
        this._deviceMeta    = {};
        this._deviceMetaLoaded = false;
        this._rooms         = [];
        this._selectedRoom  = null;
        this._detailDevice  = null;
        this._settingsView  = false;
        this._notifyView    = false;
        this._alarmsView    = false;
        this._alarms        = [];
        this._timers        = [];
        this._cardsOpen     = false;
        this._searchQuery   = '';
        this._roomButtons   = new Map();
        this._busy          = new Set();
        this._pingResults   = {};
        this._pingHideTimer = 0;
        this._sliderDebounce = 0;
        this._detailDebounce = 0;
        this._tvView         = false;
        this._tvData         = null;
        this._tvIcons        = null;
        this._tvIconsLoaded  = false;
        this._tvState        = {};
        this._cards        = [];
        this._detailCard   = null;
        this._sceneDraft   = null;
        this._chatMessages = [];
        this._chatActive   = false;

        this._syncByRoom = {};
        this._syncStatus = null;
        this._baseTopic  = 'zigduck';

        this.add_child(this._buildPanelIcon());

        const root = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
        const content = new St.BoxLayout({
            vertical: true, x_expand: true,
            style: 'min-width: 400px; max-width: 400px; spacing: 8px; padding: 6px;',
        });
        root.add_child(content);
        this.menu.addMenuItem(root);

        const header = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });

        this._bellBtn = new St.Button({ can_focus: true, style_class: 'zigduck-icon-btn' });
        this._bellBtn.set_child(buildBellWithBadge(0));
        this._bellBtn.connect('clicked', () => {
            this._notifyView   = true;
            this._settingsView = false;
            this._alarmsView   = false;
            this._detailDevice = null;
            this._detailCard   = null;
            this._sceneDraft   = null;
            this._updateToolbarState();
            this._renderContent();
        });
        header.add_child(this._bellBtn);

        this._gearBtn = new St.Button({ can_focus: true, style_class: 'zigduck-icon-btn' });
        this._gearBtn.set_child(zigduckIcon(14));
        this._gearBtn.connect('clicked', () => {
            this._settingsView = !this._settingsView;
            this._notifyView   = false;
            this._alarmsView   = false;
            this._detailDevice = null;
            this._detailCard   = null;
            this._sceneDraft   = null;
            this._updateToolbarState();
            this._renderContent();
        });
        header.add_child(this._gearBtn);

        header.add_child(plainLabel('Zigduck', 'font-weight: bold;'));
        header.add_child(new St.Widget({ x_expand: true }));
        this._status = plainLabel('…', 'font-size: 0.85em; opacity: 0.75;');
        header.add_child(this._status);
        const rb = new St.Button({ label: '↻', can_focus: true });
        rb.connect('clicked', () => this._refresh());
        header.add_child(rb);
        content.add_child(header);

        this._roomsRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 6px; padding: 2px 0;',
        });
        content.add_child(this._roomsRow);

        content.add_child(this._buildSliderRow());

        this._entry = new St.Entry({
            hint_text: 'Search devices / chat with devices…',
            x_expand: true, can_focus: true,
            style: 'padding: 4px 8px;',
        });

        this._entry.clutter_text.connect('text-changed', () => {
            this._searchQuery = this._entry.get_text().toLowerCase();
            this._schedulePreview();
            this._renderContent();
        });

        this._entry.clutter_text.connect('activate', () => this._onSearchSubmit());
        content.add_child(this._entry);

        this._previewCmd   = null;
        this._previewTimer = 0;
        this._previewLabel = plainLabel('',
            'font-size: 0.85em; opacity: 0.85; padding: 2px 8px 6px 8px; '
          + 'font-family: monospace; color: #9ecbff;');
        this._previewLabel.visible = false;
        this._previewLabel.x_expand = true;

        if (this._previewLabel.clutter_text) {
            this._previewLabel.clutter_text.line_wrap = true;
            this._previewLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        }
        content.add_child(this._previewLabel);

        content.add_child(new St.Widget({
            style: 'height: 1px; background: rgba(255,255,255,0.12); margin: 2px 0;',
        }));

        this._contentBox = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'spacing: 4px;',
        });
        content.add_child(this._contentBox);
        this._contentBox.add_child(plainLabel('Open again to load…',
            'opacity: 0.6; padding: 8px;'));

        this.menu.connect('open-state-changed', (_menu, open) => {
            if (open) {
                this._detailDevice = null;
                this._detailCard   = null;
                this._sceneDraft   = null;
                this._settingsView = false;
                this._notifyView   = false;
                this._alarmsView   = false;
                this._updateToolbarState();
                this._refresh();
            }
        });
    }


    _updateBellBadge(count)   { return updateBellBadge(this, count); }
    _updateToolbarState()     { return updateToolbarState(this); }

    _togglePill(isOn, labelText, onClick, accentColor = null, muteGlow = false, glow = false) {
        return togglePill(isOn, labelText, onClick, accentColor, muteGlow, glow);
    }


    _buildSliderRow() {
        const row = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 2px 0;',
        });
        row.add_child(new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
        }));
        this._slider = new Slider.Slider(1.0);
        this._slider.x_expand = true;
        this._slider.y_align = Clutter.ActorAlign.CENTER;
        this._slider.connect('notify::value', () => this._onSliderChanged());
        row.add_child(this._slider);
        this._brightnessPct = plainLabel('100%',
            'width: 44px; text-align: right; font-size: 0.85em;');
        row.add_child(this._brightnessPct);
        return row;
    }

    _onSliderChanged() {
        const pct = Math.round(this._slider.value * 100);
        this._brightnessPct.set_text(`${pct}%`);
        if (this._sliderDebounce) GLib.source_remove(this._sliderDebounce);
        this._sliderDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._sliderDebounce = 0;
            this._applyBrightness(pct);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _applyBrightness(pct) {
        const args = this._selectedRoom
            ? ['--room', this._selectedRoom, '--brightness', String(pct)]
            : ['--all-lights', 'true', '--brightness', String(pct)];
        this._status.set_text(`… ${pct}%`);
        try {
            await runCli(args);
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }


    _roomIsEntertainment(roomName) {
        const meta = this._roomMeta;
        if (!meta || !roomName) return false;
        if (meta[roomName] && meta[roomName].entertainment) return true;
        const lower = roomName.toLowerCase();
        if (meta[lower] && meta[lower].entertainment) return true;
        const slug = slugify(roomName);
        for (const [k, v] of Object.entries(meta)) {
            if (slugify(k) === slug && v.entertainment) return true;
        }
        return false;
    }

    _getSync(room) {
        if (!this._syncByRoom[room]) {
            this._syncByRoom[room] = { on: false, mode: null, intensity: null, open: false };
        }
        return this._syncByRoom[room];
    }

    _roomSyncOn(room) {
        return !!(this._syncByRoom[room] && this._syncByRoom[room].on);
    }

    async _loadSyncStatus() {
        try {
            const out = await runCli(['hue', 'sync', 'status'], 10);
            const parsed = JSON.parse(out);
            this._syncStatus = (parsed && typeof parsed === 'object') ? parsed : null;
        } catch (e) {
            this._syncStatus = null;
        }
    }

    _syncIsOn() {
        return !!(this._syncStatus && this._syncStatus.syncActive);
    }

    _syncLiveMode() {
        const m = (this._syncStatus && this._syncStatus.mode) || 'video';
        return ['video', 'music', 'game'].includes(m) ? m : 'video';
    }

    _syncUiModeToCli(uiMode) {
        return uiMode === 'movie'  ? 'video'
             : uiMode === 'gaming' ? 'game'
             : 'music';
    }

    _syncCliModeToUi(cliMode) {
        return cliMode === 'video' ? 'movie'
             : cliMode === 'game'  ? 'gaming'
             : 'music';
    }

    _syncLiveIntensityUi() {
        const mode = this._syncLiveMode();
        const level = this._syncStatus?.[mode]?.intensity || null;
        return level === 'subtle'   ? 'low'
             : level === 'moderate' ? 'medium'
             : level === 'intense'  ? 'extreme'
             : level === 'high'     ? 'high'
             : null;
    }

    _syncUiIntensityToCli(uiLevel) {
        return { low: 'subtle', medium: 'moderate',
                 high: 'high', extreme: 'intense' }[uiLevel];
    }

    async _syncOn() {
        this._status.set_text('… sync on');
        try {
            await runCli(['hue', 'sync', 'on'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● sync on');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncOff() {
        this._status.set_text('… sync off');
        try {
            await runCli(['hue', 'sync', 'off'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● sync off');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncToggle() {
        this._status.set_text('… sync toggle');
        try {
            await runCli(['hue', 'sync', 'toggle'], 10);
            await this._loadSyncStatus();
            this._status.set_text('● synced');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetModeUi(uiMode) {
        const cliMode = this._syncUiModeToCli(uiMode);
        this._status.set_text(`… sync mode ${cliMode}`);
        try {
            await runCli(['hue', 'sync', 'mode', cliMode], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● mode ${cliMode}`);
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetIntensityUi(uiLevel) {
        const cliLevel = this._syncUiIntensityToCli(uiLevel);
        if (!cliLevel) return;
        this._status.set_text(`… sync intensity ${cliLevel}`);
        try {
            await runCli(['hue', 'sync', 'intensity', cliLevel], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● intensity ${cliLevel}`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetBrightness(pct) {
        this._status.set_text(`… sync brightness ${pct}%`);
        try {
            await runCli(['hue', 'sync', 'brightness', String(pct)], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● sync ${pct}%`);
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _syncSetHdmiInput(n) {
        this._status.set_text(`… sync hdmi input${n}`);
        try {
            await runCli(['hue', 'sync', 'hdmi-input', String(n)], 10);
            await this._loadSyncStatus();
            this._status.set_text(`● hdmi input${n}`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }


    _generateSceneDraft() {
        const lights = this._devices.filter(d =>
            LIGHT_TYPES.has(d.type) &&
            (this._states[d.friendly_name] || {}).state === 'ON'
        );

        if (!lights.length) {
            return '/* No lights are currently ON. */';
        }

        const nixStr = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        lights.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));

        const lines = ['"New Scene" = {'];
        for (const d of lights) {
            const st = this._states[d.friendly_name] || {};
            const parts = ['state = "ON"'];

            const bri = parseInt(st.brightness, 10);
            if (Number.isFinite(bri) && bri > 0) {
                parts.push(`brightness = ${bri}`);
            }

            let c = st.color;
            if (typeof c === 'string') {
                try { c = JSON.parse(c); } catch (_) { c = null; }
            }
            if (c && typeof c === 'object') {
                if (typeof c.hex === 'string' && c.hex) {
                    parts.push(`color = { hex = "${c.hex}"; }`);
                } else if (Array.isArray(c.xy) && c.xy.length === 2) {
                    parts.push(`color = { xy = [ ${c.xy[0]} ${c.xy[1]} ]; }`);
                } else if (typeof c.x === 'number' && typeof c.y === 'number') {
                    parts.push(`color = { xy = [ ${c.x} ${c.y} ]; }`);
                }
            }

            lines.push(`    "${nixStr(d.friendly_name)}" = { ${parts.join('; ')}; };`);
        }
        lines.push('};');
        return lines.join('\n');
    }


    _renderRooms()        { return renderRooms(this); }
    _updateRoomSelection(){ return updateRoomSelection(this); }
    _syncSection()        { return renderSyncSection(this); }
    _renderSettingsView() { return renderSettingsView(this); }
    _renderAlarmsView()   { return renderAlarmsView(this); }
    _renderNotifyView()   { return renderNotifyView(this); }
    _renderChatView()     { return renderChatView(this); }
    _renderSceneDraft()   { return renderSceneDraft(this); }
    _renderCardDetail(c)  { return renderCardDetail(this, c); }
    _renderDeviceDetail(d) { return renderDeviceDetail(this, d); }
    _renderTvDetail(tv)   { return renderTvDetail(this, tv); }
    _renderTvGuideView()  { return renderTvGuideView(this); }
    _cardsSection()       { return renderCardsSection(this); }
    _deviceRow(d)         { return renderDeviceRow(this, d); }
    _sceneBtn(name)       { return renderSceneBtn(this, name); }
    _reloadSceneStylesheet() { return reloadSceneStylesheet(this); }


    async _loadStates() {
        try {
            const out = await runCli(['--state-json'], 30);
            const obj = JSON.parse(out);
            if (obj && typeof obj === 'object') return obj;
        } catch (e) {
            logError(e, 'Zigduck: --state-json failed');
        }
        return {};
    }

    async _loadNotifications() {
        try {
            const out = await runCli(['--get-notify'], 15);
            const arr = JSON.parse(out);
            if (Array.isArray(arr)) {
                if (arr.length > this._notifications.length) {
                    const player = global.display.get_sound_player();
                    player.play_from_theme('bell', 'Zigduck notification', null);
                }
                return arr;
            }
        } catch (e) {
            logError(e, 'Zigduck: --get-notify failed');
        }
        return [];
    }


    async _refresh() {
        if (!this._alive) return;
        this._status.set_text('…');
        try {
            const [devOut, states, notifArr, cardsOut] = await Promise.all([
                runCli(['--list', 'devices', '--json-output']),
                this._loadStates(),
                this._loadNotifications(),
                runCli(['--cards'], 20).catch(() => '[]'),
                this._loadSyncStatus(),
            ]);
            const devices = JSON.parse(devOut);
            if (!Array.isArray(devices)) throw new Error('unexpected device output');
            this._devices = [
                ...loadHouseDevices(),
                ...devices,
                ...loadTvs(),
            ];

            this._states  = states;
            this._notifications = Array.isArray(notifArr) ? notifArr : [];
            this._updateBellBadge(this._notifications.length);

            try {
                const cards = JSON.parse(cardsOut);
                this._cards = Array.isArray(cards) ? cards : [];
            } catch (_) { this._cards = []; }

            const scene = loadScenes();
            this._scenes      = scene.names;
            this._sceneColors = scene.colors;
            this._sceneDark   = scene.dark;
            this._roomMeta    = loadRoomMeta();
            this._baseTopic   = loadBaseTopic();

            this._reloadSceneStylesheet();

            if (!this._deviceMetaLoaded) {
                this._deviceMeta = loadDeviceMeta();
                this._deviceMetaLoaded = true;
            }

            const roomSet = new Set(this._devices.map(d => d.room || 'other'));
            const ordered = [...roomSet].sort((a, b) => {
                const ia = ROOM_ORDER.indexOf(a), ib = ROOM_ORDER.indexOf(b);
                if (ia === -1 && ib === -1) return a.localeCompare(b);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
            const roomsChanged =
                ordered.length !== this._rooms.length ||
                ordered.some((r, i) => r !== this._rooms[i]);
            this._rooms = ordered;

            if (roomsChanged) this._renderRooms();
            else this._updateRoomSelection();

            if (this._selectedRoom && !this._rooms.includes(this._selectedRoom)) {
                this._selectedRoom = null;
                this._updateRoomSelection();
            }

            this._status.set_text(
                `● ${devices.length} devices · ${Object.keys(states).length} states`);
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || 'error').slice(0, 45));
            logError(e, 'Zigduck refresh');
        }
    }


    _schedulePreview() {
        if (this._previewTimer) {
            GLib.source_remove(this._previewTimer);
            this._previewTimer = 0;
        }

        const q = this._searchQuery.trim();

        if (!q) {
            this._previewCmd = null;
            this._updatePreviewUI();
            return;
        }

        const hasMatches = this._devices.some(d =>
            d.friendly_name.toLowerCase().includes(q));
        if (hasMatches) {
            this._previewCmd = null;
            this._updatePreviewUI();
            return;
        }

        const text = this._entry.get_text().trim();
        this._previewTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this._previewTimer = 0;
            this._fetchPreview(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _fetchPreview(text) {
        if (this._entry.get_text().trim() !== text) return;
        try {
            const out = await runCmd(
                ['env', 'YO_PREVIEW=1', 'yo', 'do', text], 15);

            const lines = (out || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('yo '))
                .slice(0, 5);

            this._previewCmd = lines.length
                ? lines.map(l => l.slice(0, 400))
                : null;
        } catch (e) {
            this._previewCmd = null;
        }
        if (this._entry.get_text().trim() !== text) return;
        this._updatePreviewUI();
    }

    _updatePreviewUI() {
        if (!this._previewLabel) return;
        const list = this._previewCmd;
        if (list && list.length) {
            this._previewLabel.set_text(list.map(l => `→ ${l}`).join('\n'));
            this._previewLabel.visible = true;
        } else {
            this._previewLabel.set_text('');
            this._previewLabel.visible = false;
        }
    }

    async _onSearchSubmit() {
        const text = this._entry.get_text().trim();
        if (!text) return;

        this._entry.set_text('');

        let command = null;
        if (this._previewCmd && this._previewCmd.length) {
            command = this._previewCmd.join('  &&  ');
        } else {
            try {
                const out = await runCmd(
                    ['env', 'YO_PREVIEW=1', 'yo', 'do', text], 15);
                const lines = (out || '')
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => l.startsWith('yo '))
                    .slice(0, 5);
                if (lines.length) command = lines.join('  &&  ');
            } catch (_) { }
        }
        this._previewCmd = null;
        this._updatePreviewUI();

        this._chatActive   = true;
        this._detailCard   = null;
        this._detailDevice = null;
        this._sceneDraft   = null;
        this._settingsView = false;
        this._notifyView   = false;
        this._alarmsView   = false;
        this._tvView       = false;
        this._updateToolbarState();

        this._chatMessages.push({ role: 'user', text });
        this._renderContent();

        this._status.set_text(`… yo do "${text}"`);
        try {
            const out = await runCmd(['yo', 'do', text], 30);
            const cleaned = cleanCliOutput(out);
            const parsed  = parseYoBlock(cleaned);
            this._chatMessages.push({
                role:    'bot',
                text:    parsed.cleaned || 'Done!',
                command: command,
                ms:      parsed.ms,
            });
            this._status.set_text('● reply received');
        } catch (e) {
            logError(e, 'Zigduck: yo do failed');
            const full    = (e && e.stderrFull) || (e && e.message) || 'command failed';
            const cleaned = cleanCliOutput(full);
            const parsed  = parseYoBlock(cleaned);
            this._chatMessages.push({
                role:    'bot',
                text:    `⚠️ ${parsed.cleaned || full}`,
                command: command,
                ms:      parsed.ms,
            });
            this._status.set_text('✗ yo do failed');
        }
        this._renderContent();
    }


    _renderContent() {
        this._contentBox.destroy_all_children();

        if (this._sceneDraft !== null) {
            this._contentBox.add_child(this._renderSceneDraft());
            return;
        }
        if (this._detailCard) {
            this._contentBox.add_child(this._renderCardDetail(this._detailCard));
            return;
        }
        if (this._detailDevice) {
            if (this._detailDevice.type === 'tv') {
                this._contentBox.add_child(this._renderTvDetail(this._detailDevice));
            } else { this._contentBox.add_child(this._renderDeviceDetail(this._detailDevice)); }
            return;
        }
        if (this._settingsView) {
            this._contentBox.add_child(this._renderSettingsView());
            return;
        }
        if (this._notifyView) {
            this._contentBox.add_child(this._renderNotifyView());
            return;
        }
        if (this._alarmsView) {
            this._contentBox.add_child(this._renderAlarmsView());
            return;
        }
        if (this._tvView) {
            this._contentBox.add_child(this._renderTvGuideView());
            return;
        }
        if (this._chatActive) {
            this._contentBox.add_child(this._renderChatView());
            return;
        }

        const q = this._searchQuery.trim();
        if (q) {
            const matches = sortDevices(
                this._devices.filter(d => d.friendly_name.toLowerCase().includes(q)),
                this._states);
            if (!matches.length) {
                if (!this._previewCmd) {
                    this._contentBox.add_child(plainLabel(
                        'Press enter to send…',
                        'opacity: 0.7; padding: 12px; font-style: italic;'));
                }
                return;
            }
            for (const d of matches) this._contentBox.add_child(this._deviceRow(d));
            return;
        }

        if (!this._selectedRoom) {
            this._contentBox.add_child(this._cardsSection());
        }

        const headerRow = new St.BoxLayout({
            x_expand: true, style: 'spacing: 8px; padding: 6px 0 10px 0;',
        });
        const headerText = this._selectedRoom
            ? this._selectedRoom.toUpperCase()
            : 'SCENES';
        headerRow.add_child(plainLabel(headerText,
            'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
        headerRow.add_child(new St.Widget({ x_expand: true }));

        if (this._selectedRoom) {
            const devs = this._devices.filter(d =>
                (d.room || 'other') === this._selectedRoom && ONOFF_TYPES.has(d.type));
            if (devs.length) {
                const onCount = devs.filter(d => {
                    const st = this._states[d.friendly_name] || {};
                    return st.state === 'ON' && !isOffline(st);
                }).length;
                const anyOn = onCount > 0;
                const pill = this._togglePill(
                    anyOn,
                    `${onCount}/${devs.length} on`,
                    () => this._roomCmd(this._selectedRoom, anyOn ? 'off' : 'on')
                );
                pill.style_class = 'zigduck-room-action'
                    + (anyOn ? ' zigduck-room-action-on' : '');
                headerRow.add_child(pill);
            }
        } else {
            const addBtn = new St.Button({
                can_focus: true, style_class: 'zigduck-icon-btn',
            });
            addBtn.set_child(new St.Icon({
                icon_name: 'list-add-symbolic', icon_size: 14,
            }));
            addBtn.connect('clicked', () => {
                this._sceneDraft = this._generateSceneDraft();
                this._detailCard   = null;
                this._detailDevice = null;
                this._settingsView = false;
                this._notifyView   = false;
                this._alarmsView   = false;
                this._tvView       = false;
                this._updateToolbarState();
                this._renderContent();
            });
            headerRow.add_child(addBtn);
        }
        this._contentBox.add_child(headerRow);

        if (this._selectedRoom) {
            if (this._roomIsEntertainment(this._selectedRoom)) {
                this._contentBox.add_child(this._syncSection());
            }
            const devs = sortDevices(
                this._devices.filter(d => (d.room || 'other') === this._selectedRoom),
                this._states);
            if (!devs.length) {
                this._contentBox.add_child(plainLabel('No devices in this room.',
                    'opacity: 0.6; padding: 8px;'));
                return;
            }
            for (const d of devs) this._contentBox.add_child(this._deviceRow(d));
            return;
        }

        if (!this._scenes.length) {
            this._contentBox.add_child(plainLabel('No scenes available. Check scenes.json.',
                'opacity: 0.6; padding: 8px;'));
            return;
        }

        const grid = new St.BoxLayout({ vertical: true, x_expand: true, style: 'spacing: 6px;' });
        for (let i = 0; i < this._scenes.length; i += 2) {
            const row = new St.BoxLayout({ x_expand: true, style: 'spacing: 6px;' });
            row.add_child(this._sceneBtn(this._scenes[i]));
            if (this._scenes[i + 1]) row.add_child(this._sceneBtn(this._scenes[i + 1]));
            else                     row.add_child(new St.Widget({ x_expand: true }));
            grid.add_child(row);
        }
        this._contentBox.add_child(grid);
    }


    async _openTvGuide() {
        this._tvView       = true;
        this._settingsView = false;
        this._notifyView   = false;
        this._alarmsView   = false;
        this._detailDevice = null;
        this._detailCard   = null;
        this._sceneDraft   = null;
        this._updateToolbarState();
        if (!this._tvIconsLoaded) {
            this._tvIcons = loadTvIcons();
            this._tvIconsLoaded = true;
        }
        await this._loadTvGuide();
        this._renderContent();
    }

    async _loadTvGuide() {
        try {
            const path = resolvePath('epg.json');
            const file = Gio.File.new_for_path(path);
            if (!file.query_exists(null)) {
                logError(new Error(`not found: ${path}`), 'Zigduck: epg.json');
                this._tvData = null;
                return;
            }
            const [, bytes] = file.load_contents(null);
            this._tvData = JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) {
            logError(e, 'Zigduck: could not parse epg.json');
            this._tvData = null;
        }
    }

    _tvGetState(tvKey) {
        if (!this._tvState[tvKey]) {
            this._tvState[tvKey] = {
                power: false,
                volume: 50,
                channelsOpen: false,
                remoteOpen: false,
            };
        }
        return this._tvState[tvKey];
    }

    async _tvSend(tv, typ, extra = []) {
        this._status.set_text(`… tv --typ ${typ} --ip ${tv.ip}`);
        try {
            await runCmd(['tv', '--typ', typ, '--ip', tv.ip, ...extra], 15);
            this._status.set_text('● done');
            return true;
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
            return false;
        }
    }

    async _tvFlushVolume(tv, st, target) {
        const diff = target - st.volume;
        if (diff === 0) return;
        st.volume = target;
        const typ   = diff > 0 ? 'up' : 'down';
        const count = Math.min(Math.abs(diff), 30);
        this._status.set_text(`… volume ${typ} × ${count}`);
        try {
            const proms = [];
            for (let i = 0; i < count; i++) {
                proms.push(runCmd(['tv', '--typ', typ, '--ip', tv.ip], 10)
                    .catch(() => {}));
            }
            await Promise.all(proms);
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _tvToggleFromList(tv) {
        const st = this._tvGetState(tv.tvKey);
        st.power = !st.power;
        this._renderContent();
        await this._tvSend(tv, st.power ? 'on' : 'off');
    }


    async _openAlarmsView() {
        this._alarmsView   = true;
        this._settingsView = false;
        this._notifyView   = false;
        this._detailDevice = null;
        this._detailCard   = null;
        this._sceneDraft   = null;
        this._updateToolbarState();
        await this._loadAlarmsAndTimers();
        this._renderContent();
    }

    async _loadAlarmsAndTimers() {
        try {
            const [aOut, tOut] = await Promise.all([
                runCli(['alarm', 'list'], 15).catch(() => '[]'),
                runCli(['timer', 'list'], 15).catch(() => '[]'),
            ]);
            try { this._alarms = JSON.parse(aOut) || []; } catch (_) { this._alarms = []; }
            try { this._timers = JSON.parse(tOut) || []; } catch (_) { this._timers = []; }
            if (!Array.isArray(this._alarms)) this._alarms = [];
            if (!Array.isArray(this._timers)) this._timers = [];
        } catch (e) {
            logError(e, 'Zigduck: load alarms/timers failed');
        }
    }

    async _toggleAlarm(alarm) {
        const id = alarm.id;
        this._status.set_text(`… alarm toggle ${id}`);
        try {
            await runCli(['alarm', 'toggle', String(id)]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● done');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _removeAlarm(alarm) {
        const hh = String(alarm.hour ?? 0).padStart(2, '0');
        const mm = String(alarm.minute ?? 0).padStart(2, '0');
        this._status.set_text(`… removing alarm ${hh}:${mm}`);
        try {
            await runCli(['alarm', 'remove', '--time', `${hh}:${mm}`]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● removed');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }

    async _cancelTimer(timer) {
        const id = timer.id;
        if (id === undefined) {
            this._status.set_text('timer has no id — cannot cancel');
            return;
        }
        this._status.set_text(`… cancelling timer ${id}`);
        try {
            await runCli(['timer', 'cancel', String(id)]);
            await this._loadAlarmsAndTimers();
            this._status.set_text('● cancelled');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 60));
        }
    }


    async _clearNotifications() {
        this._status.set_text('… clearing notifications');
        try {
            await runCli(['--clear-notify']);
            this._notifications = [];
            this._updateBellBadge(0);
            this._status.set_text('🗑 cleared');
            this._renderContent();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }


    _buildPanelIcon() {
        const svgPath = `${extensionDir()}/icons/zigduck-symbolic.svg`;
        const pngPath = `${extensionDir()}/icons/zigduck-32.png`;
        const svgFile = Gio.File.new_for_path(svgPath);
        if (svgFile.query_exists(null)) {
            return new St.Icon({
                gicon: new Gio.FileIcon({file: svgFile}),
                style_class: 'system-status-icon',
            });
        }
        const pngFile = Gio.File.new_for_path(pngPath);
        if (pngFile.query_exists(null)) {
            return new St.Icon({
                gicon: new Gio.FileIcon({file: pngFile}),
                style_class: 'system-status-icon',
            });
        }
        return new St.Icon({
            icon_name: 'preferences-system-symbolic',
            style_class: 'system-status-icon',
        });
    }


    async _pingHost(d) {
        if (!d.ip) {
            this._status.set_text('✗ no ip configured');
            return;
        }
        this._status.set_text(`… ping ${d.ip}`);

        const args = ['-c', '1', '-W', '2', d.ip];
        const candidates = [
            'ping',
            '/run/current-system/sw/bin/ping',
            '/usr/bin/ping',
            '/bin/ping',
        ];

        let lastErr = null;
        for (const bin of candidates) {
            try {
                const out = await runCmd([bin, ...args], 5);
                const m = /time[=<]\s*([\d.]+)\s*ms/.exec(out);
                this._pingResults[d.friendly_name] = {
                    ok: true,
                    ms: m ? parseFloat(m[1]) : null,
                    pingedAt: Date.now(),
                };
                try {
                    await runCli([
                        '--publish',
                        '--topic', `${this._baseTopic}/${d.friendly_name}`,
                        '--payload', JSON.stringify({ last_seen: new Date().toISOString() }),
                    ], 5);
                } catch (_) { }
                this._status.set_text(
                    `● ${d.friendly_name} ${m ? m[1] + ' ms' : 'reachable'}`);
                this._renderContent();
                return;
            } catch (e) {
                const msg = (e && e.message) || '';
                const code = e && e.exitCode;
                if (/Cannot launch/i.test(msg)) {
                    lastErr = e;
                    continue;
                }
                if (code === 1) {
                    this._pingResults[d.friendly_name] = { ok: false, error: msg, pingedAt: Date.now() };
                    this._status.set_text(`✗ ${d.friendly_name} unreachable`);
                } else {
                    this._pingResults[d.friendly_name] = { ok: null, error: msg, pingedAt: Date.now() };
                    this._status.set_text(`✗ ping failed: ${msg}`);
                }
                this._renderContent();
                return;
            }
        }

        const errMsg = lastErr ? lastErr.message : 'not found';
        this._pingResults[d.friendly_name] = { ok: null, error: errMsg, pingedAt: Date.now() };
        this._status.set_text('✗ ping binary not found — add iputils to systemPackages');
        this._renderContent();
    }

    async _devCmd(device, state) {
        const key = device.friendly_name;
        if (this._busy.has(key)) return;
        this._busy.add(key);
        this._status.set_text(`… ${key} ${state}`);
        try {
            await runCli(['--device', key, '--state', state]);
            const cur = (this._states[key] || {}).state;
            const next = state === 'toggle' ? (cur === 'ON' ? 'OFF' : 'ON')
                       : state === 'on' ? 'ON'
                       : state === 'off' ? 'OFF'
                       : cur;
            this._states[key] = { ...(this._states[key] || {}), state: next };
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        } finally {
            this._busy.delete(key);
        }
    }

    async _devBrightness(device, value) {
        const key = device.friendly_name;
        this._status.set_text(`… ${key} brightness ${value}`);
        try {
            await runCli(['--device', key, '--brightness', String(value)]);
            this._states[key] = { ...(this._states[key] || {}), brightness: String(value) };
            this._status.set_text('● done');
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    async _devColor(device, hex) {
        const key = device.friendly_name;
        this._status.set_text(`… ${key} → ${hex}`);
        try {
            await runCli(['--device', key, '--color', hex]);

            this._states[key] = {
                ...(this._states[key] || {}),
                state: 'ON',
                color: JSON.stringify({ hex }),
            };
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                this._refresh().then(() => {
                    if (this._detailDevice) {
                        const fresh = this._devices.find(
                            d => d.friendly_name === this._detailDevice.friendly_name);
                        if (fresh) this._detailDevice = fresh;
                    }
                    return GLib.SOURCE_REMOVE;
                });
                return GLib.SOURCE_REMOVE;
            });
        } catch (e) { this._status.set_text('✗ ' + (e.message || '').slice(0, 45)); }
    }

    async _roomCmd(room, state) {
        this._status.set_text(`… ${room} ${state}`);
        try {
            await runCli(['--room', room, '--state', state]);
            for (const d of this._devices) {
                if ((d.room || 'other') === room && ONOFF_TYPES.has(d.type)) {
                    const cur = (this._states[d.friendly_name] || {}).state;
                    const next = state === 'toggle' ? (cur === 'ON' ? 'OFF' : 'ON')
                               : state === 'on' ? 'ON'
                               : state === 'off' ? 'OFF'
                               : cur;
                    this._states[d.friendly_name] = {
                        ...(this._states[d.friendly_name] || {}),
                        state: next,
                    };
                }
            }
            this._status.set_text('● done');
            this._renderContent();
            this._updateRoomSelection();
        } catch (e) {
            this._status.set_text('✗ ' + (e.message || '').slice(0, 45));
        }
    }

    async _runScene(name) {
        this._status.set_text(`… ✦ ${name}`);
        try {
            await runCli(['--scene', name]);
            this._status.set_text('● done');
        } catch (e) { this._status.set_text('✗ ' + (e.message || '').slice(0, 45)); }
    }

    destroy() {
        this._alive = false;
        unloadSceneStylesheet(this);
        if (this._sliderDebounce) {
            GLib.source_remove(this._sliderDebounce);
            this._sliderDebounce = 0;
        }
        if (this._detailDebounce) {
            GLib.source_remove(this._detailDebounce);
            this._detailDebounce = 0;
        }
        if (this._pingHideTimer) {
            GLib.source_remove(this._pingHideTimer);
            this._pingHideTimer = 0;
        }
        super.destroy();
    }
});

export default ZigduckIndicator;
