import St     from 'gi://St';
import Clutter from 'gi://Clutter';

import { SCENE_COLOR_OVERRIDES } from '../constants.js';
import { plainLabel } from '../icons.js';
import { buildGradientStrip } from '../widgets.js';

export function renderSceneBtn(indicator, name) {
    const isDark = indicator._sceneDark?.[name]   || false;
    const colors = indicator._sceneColors?.[name] || [];

    let palette = colors;
    if (SCENE_COLOR_OVERRIDES[name]) palette = [SCENE_COLOR_OVERRIDES[name]];
    else if (isDark)                 palette = ['#000000'];
    else if (!colors.length)         palette = ['#ffffff'];

    const btn = new St.Button({
        can_focus: true, x_expand: true,
        style: 'padding: 0; '
             + 'border-radius: 8px; '
             + 'border: 1px solid rgba(0,0,0,0.15); '
             + 'min-height: 46px;',
    });

    const stack = new St.Widget({
        layout_manager: new Clutter.BinLayout(),
        x_expand: true, y_expand: true,
    });

    stack.add_child(buildGradientStrip(palette, 24));

    const lbl = plainLabel('✦ ' + name,
        `font-weight: bold; color: ${isDark ? '#fff' : '#000'};`);
    lbl.x_align = Clutter.ActorAlign.CENTER;
    lbl.y_align = Clutter.ActorAlign.CENTER;
    lbl.x_expand = true;
    lbl.y_expand = true;
    stack.add_child(lbl);

    btn.set_child(stack);
    btn.connect('clicked', () => indicator._runScene(name));
    return btn;
}

export function renderSceneDraft(indicator) {
    const draft = indicator._sceneDraft || '';
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
        indicator._sceneDraft = null;
        indicator._renderContent();
    });
    backRow.add_child(back);
    backRow.add_child(new St.Widget({ x_expand: true }));
    wrap.add_child(backRow);

    const titleRow = new St.BoxLayout({
        x_expand: true, style: 'spacing: 8px; padding: 6px 0 4px 0;',
    });
    titleRow.add_child(plainLabel('✦ NEW SCENE',
        'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
    titleRow.add_child(new St.Widget({ x_expand: true }));
    wrap.add_child(titleRow);

    const onCount = (draft.match(/\{ state = "ON"/g) || []).length;
    wrap.add_child(plainLabel(
        onCount
            ? `${onCount} light${onCount === 1 ? '' : 's'} currently ON — paste under house.zigbee.scenes`
            : 'No lights are currently ON.',
        'opacity: 0.65; font-size: 0.85em; padding-bottom: 6px;'));

    const scroll = new St.ScrollView({
        x_expand: true, y_expand: true,
        style: 'max-height: 340px;',
    });
    scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);

    const textLabel = new St.Label({ text: draft });
    if (textLabel.clutter_text) {
        textLabel.clutter_text.set_selectable(true);
        textLabel.clutter_text.set_editable(false);
    }
    textLabel.style =
        'font-family: monospace; font-size: 0.85em; '
      + 'padding: 8px 10px; '
      + 'background-color: rgba(0,0,0,0.25); '
      + 'border: 1px solid rgba(255,255,255,0.10); '
      + 'border-radius: 6px;';
    scroll.add_child(textLabel);
    wrap.add_child(scroll);

    const copyRow = new St.BoxLayout({
        x_expand: true, style: 'spacing: 8px; padding-top: 6px;',
    });
    copyRow.add_child(new St.Widget({ x_expand: true }));

    const copyBtn = new St.Button({
        can_focus: true, style_class: 'zigduck-pill',
        style: 'padding: 8px 20px;',
    });
    const cb = new St.BoxLayout({ style: 'spacing: 6px;' });
    cb.add_child(new St.Icon({
        icon_name: 'edit-copy-symbolic', icon_size: 14,
        y_align: Clutter.ActorAlign.CENTER,
    }));
    cb.add_child(plainLabel('Copy to clipboard', 'font-weight: bold;'));
    copyBtn.set_child(cb);
    copyBtn.connect('clicked', () => {
        const clip = St.Clipboard.get_default();
        clip.set_text(St.ClipboardType.CLIPBOARD, draft);
        indicator._status.set_text('📋 copied scene draft');
    });
    copyRow.add_child(copyBtn);
    copyRow.add_child(new St.Widget({ x_expand: true }));
    wrap.add_child(copyRow);

    return wrap;
}
