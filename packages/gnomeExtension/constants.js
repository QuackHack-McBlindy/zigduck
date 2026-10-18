export const SCENE_COLOR_OVERRIDES = {};

export const CLI = 'zigduck-cli';
export const SCENES_CONFIG_PATH  = 'scenes.json';
export const ROOMS_CONFIG_PATH   = 'rooms.json';
export const DEVICES_CONFIG_PATH = 'devices.json';
export const HOUSE_CONFIG_PATH   = 'config.json';

export const DEBUG_RED_SCENES = false;

export const ONOFF_TYPES  = new Set(['light', 'hue_light', 'outlet', 'pusher']);
export const LIGHT_TYPES  = new Set(['light', 'hue_light']);
export const OFFLINE_MS   = 2 * 24 * 60 * 60 * 1000;
export const STALE_MS     = 24 * 2 * 60 * 60 * 1000;

export const FA_EMOJI = {
    'fa-bitcoin':            '₿',
    'fa-monero':             'ɱ',
    'fa-bolt':               '⚡',
    'fa-thermometer-half':   '🌡',
    'fa-calendar':           '📅',
    'fa-chart-line':         '📈',
    'fa-fire':               '🔥',
    'fa-tint':               '💧',
};

export const MDI_EMOJI = {
    'ceiling-light': '💡', 'lightbulb': '💡', 'weather-night': '🌙',
    'chandelier': '🕯️', 'gesture-tap-button': '🔘', 'water': '💧',
    'motion-sensor': '👁️', 'remote': '📱', 'toggle-switch': '🔘',
    'spotlight': '🔦', 'power-socket-eu': '🔌', 'smoke-detector': '🚨',
    'door': '🚪', 'door-open': '🚪', 'led-strip-variant': '🌈',
    'blinds': '🪟', 'home': '🏠', 'duck': '🦆', 'sofa': '🛋️',
    'stove': '🍳', 'bed': '🛏️', 'television': '📺', 'toilet': '🚽',
    'dots-horizontal': '⋯', 'lamp': '💡', 'floor-lamp': '🛋️',
    'wall-sconce-round': '🔆', 'light-switch': '🔘', 'power': '⏻',
    'music': '🎵', 'movie': '🎬', 'gamepad-variant': '🎮',
    'alarm': '⏰', 'timer': '⏱️', 'desktop-tower': '🖥️',
    'nas':           '🗄️',
    'server':        '🖥️',
    'server-network':'🖥️',
    'laptop':        '💻',
};

export const ROOM_EMOJI = {
    livingroom: '🛋️', kitchen: '🍳', bedroom: '🛏️', 'tv-area': '📺',
    hallway: '🚪', wc: '🚽', other: '⋯',
};
export const ROOM_ORDER = ['livingroom', 'kitchen', 'bedroom', 'tv-area', 'hallway', 'wc', 'other'];

export const GREEN = '#2ecc71';
export const RED   = '#e74c3c';
export const ROOM_ON_COLOR   = '#ffd166';
export const ROOM_SYNC_COLOR = '#8b5cf6';
export const SYNC_ACCENT = '#8b5cf6';
