import St        from 'gi://St';
import Clutter   from 'gi://Clutter';

import { RED } from '../constants.js';
import { faIcon, plainLabel } from '../icons.js';
import { isCardStale, timeAgo } from '../utils.js';
import { sparkline } from '../widgets.js';

export function renderCardsSection(indicator) {
    const wrap = new St.BoxLayout({
        vertical: true, x_expand: true, style: 'spacing: 6px;',
    });

    const headerRow = new St.BoxLayout({
        x_expand: true, reactive: true, track_hover: true,
        style: 'spacing: 8px; padding: 6px 0 10px 0;',
    });
    headerRow.add_child(plainLabel('CARDS',
        'font-size: 1.5em; font-weight: bold; opacity: 0.9;'));
    headerRow.add_child(new St.Widget({ x_expand: true }));

    const chevron = new St.Button({
        can_focus: true, style_class: 'zigduck-icon-btn',
    });
    chevron.set_child(new St.Icon({
        icon_name: indicator._cardsOpen ? 'pan-down-symbolic' : 'pan-end-symbolic',
        icon_size: 14,
    }));
    headerRow.add_child(chevron);

    const toggle = () => {
        indicator._cardsOpen = !indicator._cardsOpen;
        indicator._renderContent();
    };
    headerRow.connect('button-release-event', () => {
        toggle(); return Clutter.EVENT_STOP;
    });
    chevron.connect('clicked', toggle);
    wrap.add_child(headerRow);

    if (!indicator._cardsOpen) return wrap;

    if (!indicator._cards.length) {
        wrap.add_child(plainLabel('No cards configured.',
            'opacity: 0.6; padding: 8px; font-size: 0.9em;'));
        return wrap;
    }

    const groups = new Map();
    for (const c of indicator._cards) {
        const g = c.group || 'other';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(c);
    }

    for (const [group, cards] of groups) {
        if (groups.size > 1) {
            wrap.add_child(plainLabel(group.toUpperCase(),
                'opacity: 0.55; font-size: 0.75em; padding: 6px 0 2px 0;'));
        }
        for (const c of cards) wrap.add_child(cardRow(indicator, c));
    }
    return wrap;
}

function cardRow(indicator, card) {
    const available = card.available !== false;

    const rowStyle = available
        ? 'spacing: 6px; padding: 3px 5px; border-radius: 4px;'
        : 'spacing: 6px; padding: 3px 5px; border-radius: 4px; '
          + 'background-color: rgba(243, 156, 18, 0.10); '
          + 'border: 1px solid rgba(243, 156, 18, 0.30);';

    const row = new St.BoxLayout({
        x_expand: true, reactive: true, track_hover: true, style: rowStyle,
    });
    row.connect('button-release-event', () => {
        indicator._detailCard = card;
        indicator._renderContent();
        return Clutter.EVENT_STOP;
    });

    row.add_child(faIcon(card.icon, 16));

    row.add_child(plainLabel(card.title || card.id,
        card.color
            ? `color: ${card.color}; font-weight: bold;`
            : 'font-weight: bold;'));

    if (!available) {
        row.add_child(plainLabel('⚠️', 'font-size: 0.9em;'));
    } else if (isCardStale(card)) {
        row.add_child(plainLabel('⚠️',
            'font-size: 0.9em; color: #f39c12;'));
    }

    row.add_child(new St.Widget({ x_expand: true }));

    if (available) {
        row.add_child(plainLabel(String(card.value ?? '—'),
            'font-weight: bold; font-size: 0.95em;'));
    }

    return row;
}

export function renderCardDetail(indicator, card) {
    const available = card.available !== false;
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
        indicator._detailCard = null;
        indicator._renderContent();
    });
    backRow.add_child(back);
    backRow.add_child(new St.Widget({ x_expand: true }));

    const refreshBtn = new St.Button({
        can_focus: true, style_class: 'zigduck-icon-btn',
    });
    refreshBtn.set_child(new St.Icon({
        icon_name: 'view-refresh-symbolic', icon_size: 14,
    }));
    refreshBtn.connect('clicked', async () => {
        await indicator._refresh();
        const fresh = indicator._cards.find(c => c.id === card.id);
        if (fresh) indicator._detailCard = fresh;
        indicator._renderContent();
    });
    backRow.add_child(refreshBtn);
    wrap.add_child(backRow);

    const titleRow = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
    titleRow.add_child(faIcon(card.icon, 26));
    titleRow.add_child(plainLabel(card.title || card.id,
        'font-weight: bold; font-size: 1.15em; '
      + (card.color ? `color: ${card.color};` : '')));
    titleRow.add_child(new St.Widget({ x_expand: true }));
    if (!available) {
        titleRow.add_child(plainLabel('OFFLINE',
            `color: ${RED}; font-weight: bold; font-size: 0.75em; `
          + `border: 1px solid ${RED}; border-radius: 3px; padding: 1px 6px;`));
    }
    wrap.add_child(titleRow);

    if (!available) {
        wrap.add_child(plainLabel('No data available for this card.',
            'opacity: 0.7; padding: 12px 0; font-style: italic;'));
        if (card.error) {
            wrap.add_child(plainLabel(String(card.error),
                'opacity: 0.5; font-size: 0.8em; font-family: monospace;'));
        }
        return wrap;
    }

    wrap.add_child(plainLabel(String(card.value ?? '—'),
        `font-size: 2.1em; font-weight: bold; padding: 4px 0; `
      + (card.color ? `color: ${card.color};` : '')));

    if (card.last_updated) {
        const stale = isCardStale(card);
        wrap.add_child(plainLabel(
            `Updated ${timeAgo(card.last_updated)}${stale ? '  ⚠️' : ''}`,
            stale
                ? 'color: #f39c12; font-weight: bold; '
                + 'font-size: 0.85em; padding-bottom: 6px; opacity: 1;'
                : 'opacity: 0.65; font-size: 0.85em; padding-bottom: 6px;'));
    }

    if (card.details) {
        wrap.add_child(plainLabel(String(card.details),
            'opacity: 0.8; font-size: 0.9em; padding-bottom: 6px;'));
    }

    const hist = Array.isArray(card.history) ? card.history : null;
    if (card.chart && hist && hist.length > 1) {
        wrap.add_child(sparkline(hist, card.color || '#8b5cf6'));

        const nums = hist.map(Number).filter(Number.isFinite);
        if (nums.length) {
            const lo = Math.min(...nums);
            const hi = Math.max(...nums);
            const range = new St.BoxLayout({
                x_expand: true, style: 'spacing: 8px; padding-top: 4px;',
            });
            range.add_child(plainLabel(`min ${lo}`,
                'opacity: 0.7; font-size: 0.8em;'));
            range.add_child(new St.Widget({ x_expand: true }));
            range.add_child(plainLabel(`${nums.length} pts`,
                'opacity: 0.5; font-size: 0.8em;'));
            range.add_child(new St.Widget({ x_expand: true }));
            range.add_child(plainLabel(`max ${hi}`,
                'opacity: 0.7; font-size: 0.8em;'));
            wrap.add_child(range);
        }
    } else if (card.chart) {
        wrap.add_child(plainLabel('No history data yet.',
            'opacity: 0.6; padding: 8px 0; font-size: 0.9em;'));
    }

    const meta = [];
    if (card.group)  meta.push(['group', card.group]);
    if (card.format) meta.push(['format', card.format]);
    if (card.id)     meta.push(['id', card.id]);
    if (meta.length) {
        wrap.add_child(plainLabel('Details',
            'font-weight: bold; margin-top: 4px;'));
        for (const [k, v] of meta) {
            const r = new St.BoxLayout({ x_expand: true, style: 'spacing: 8px;' });
            r.add_child(plainLabel(k, 'opacity: 0.7; font-size: 0.85em;'));
            r.add_child(new St.Widget({ x_expand: true }));
            r.add_child(plainLabel(String(v),
                'font-size: 0.85em; font-family: monospace;'));
            wrap.add_child(r);
        }
    }

    return wrap;
}
