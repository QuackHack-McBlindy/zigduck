import Gio   from 'gi://Gio';
import GLib  from 'gi://GLib';
import St    from 'gi://St';

import { SCENE_COLOR_OVERRIDES } from './constants.js';
import { slugify } from './utils.js';

function buildGradientSvg(colors) {
    const stops = colors.map((c, i) => {
        const offset = (i / Math.max(colors.length - 1, 1)) * 100;
        return `<stop offset="${offset}%" stop-color="${c}"/>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"
     viewBox="0 0 200 60" preserveAspectRatio="none">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
      ${stops}
    </linearGradient>
  </defs>
  <rect width="200" height="60" fill="url(#g)"/>
</svg>`;
}

export function reloadSceneStylesheet(indicator) {
    try {
        const rules = [];

        for (const name of (indicator._scenes || [])) {
            const slug     = slugify(name);
            const isDark   = indicator._sceneDark?.[name] || false;
            const colors   = indicator._sceneColors?.[name] || [];
            const override = SCENE_COLOR_OVERRIDES?.[name] || null;

            let palette = colors;
            if (override)             palette = [override];
            else if (isDark)          palette = ['#000000'];
            else if (!colors.length)  palette = ['#ffffff'];

            const textColor = isDark ? '#ffffff' : '#000000';

            const svgPath = `${GLib.get_tmp_dir()}/zigduck-scene-${slug}.svg`;
            GLib.file_set_contents(svgPath, buildGradientSvg(palette));

            rules.push(
                `.zigduck-scene-${slug} {\n` +
                `  background-image: url('file://${svgPath}');\n` +
                `  background-size: 100% 100%;\n` +
                `  background-color: ${palette[0]};\n` +
                `  color: ${textColor};\n` +
                `}\n`
            );
        }

        const css  = rules.join('\n');
        const path = GLib.build_filenamev([GLib.get_tmp_dir(), 'zigduck-scenes.css']);
        GLib.file_set_contents(path, css);

        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        if (indicator._scenesStylesheet) {
            try { theme.unload_stylesheet(indicator._scenesStylesheet); } catch (_) {}
        }
        const file = Gio.File.new_for_path(path);
        theme.load_stylesheet(file);
        indicator._scenesStylesheet = file;
    } catch (e) {
        logError(e, 'Zigduck: failed to load scene stylesheet');
    }
}

export function unloadSceneStylesheet(indicator) {
    if (!indicator._scenesStylesheet) return;
    try {
        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme.unload_stylesheet(indicator._scenesStylesheet);
    } catch (_) {}
    indicator._scenesStylesheet = null;
}
