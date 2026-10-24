// Generate the option reference pages from the nixosOptionsDoc JSON in ../hooks.
// Runs before `astro dev` and `astro build`, so the reference always matches
// whatever hooks/get-options.sh last produced.
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repo, branch } from '../site.config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, '..', 'src', 'content', 'docs', 'reference', 'options');

const sources = ['hooks/options.json', 'hooks/service.json'];

// Each page owns the options under `prefix`, minus any prefix in `exclude`.
// Order here is the sidebar order.
const pages = [
	{
		slug: 'service',
		title: 'services.zigduck',
		prefix: 'services.zigduck',
		description: 'Enable the zigduck service, the CLI, the dashboard and the GNOME extension.',
	},
	{
		slug: 'rooms',
		title: 'house.rooms',
		prefix: 'house.rooms',
		description: 'Rooms that devices, dimmers and automations are grouped by.',
	},
	{
		slug: 'zigbee',
		title: 'house.zigbee',
		prefix: 'house.zigbee',
		exclude: ['house.zigbee.automations'],
		description: 'Coordinator, Mosquitto, Zigbee devices, scenes, dimmers, motion and the Hue Sync Box.',
	},
	{
		slug: 'automations',
		title: 'house.zigbee.automations',
		prefix: 'house.zigbee.automations',
		description: 'Time based, MQTT triggered, room, global, dimmer, presence and greeting automations.',
	},
	{
		slug: 'devices',
		title: 'house.devices',
		prefix: 'house.devices',
		description: 'Non-Zigbee devices such as NixOS hosts and ESP32 hardware.',
	},
	{
		slug: 'dashboard',
		title: 'house.dashboard',
		prefix: 'house.dashboard',
		description: 'Status cards and extra pages on the generated web dashboard.',
	},
	{
		slug: 'media',
		title: 'house.media',
		prefix: 'house.media',
		description: 'Media library folders used by the tv controller.',
	},
	{
		slug: 'tv',
		title: 'house.tv',
		prefix: 'house.tv',
		description: 'Android TV devices controlled over ADB, their apps, channels and EPG scraping.',
	},
	{
		slug: 'https',
		title: 'house.https',
		prefix: 'house.https',
		description: 'HTTPS URLs for the dashboard API and the media server.',
	},
];

function load() {
	const all = {};
	for (const rel of sources) {
		const path = join(root, rel);
		if (!existsSync(path)) continue;
		Object.assign(all, JSON.parse(readFileSync(path, 'utf8')));
	}
	if (!Object.keys(all).length) {
		throw new Error(`No option JSON found in ${sources.join(', ')}`);
	}
	return all;
}

const under = (name, prefix) => name === prefix || name.startsWith(prefix + '.');

// Escape raw HTML outside inline code, since descriptions are written for
// the NixOS manual and use things like <name> as plain text.
function escapeProse(text) {
	return text
		.split(/(`[^`]*`)/)
		.map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;').replace(/>/g, '&gt;')))
		.join('');
}

function codeValue(value) {
	if (!value) return null;
	const text = typeof value === 'object' ? value.text : String(value);
	return text == null ? null : String(text).trim();
}

function renderValue(label, value) {
	const text = codeValue(value);
	if (text == null) return '';
	if (!text.includes('\n') && text.length < 70 && !text.includes('`')) {
		return `**${label}:** \`${text}\`\n\n`;
	}
	return `**${label}:**\n\n\`\`\`nix\n${text}\n\`\`\`\n\n`;
}

function sourceLink(declarations = []) {
	const links = declarations
		.map((d) => d.match(/-source\/(.+)$/)?.[1])
		.filter(Boolean)
		.map((p) => `[\`${p}\`](${repo}/blob/${branch}/${p})`);
	return links.length ? `**Declared in:** ${links.join(', ')}\n\n` : '';
}

function renderOption(name, opt) {
	let md = `### \`${name}\`\n\n`;
	const desc = (opt.description || '').trim();
	if (desc && desc !== 'This option has no description.') {
		md += escapeProse(desc) + '\n\n';
	}
	md += `**Type:** ${escapeProse(opt.type || 'unspecified')}\n\n`;
	if (opt.readOnly) md += '**Read only.**\n\n';
	md += renderValue('Default', opt.default);
	md += renderValue('Example', opt.example);
	md += sourceLink(opt.declarations);
	return md;
}

// Named path segments below the page prefix, ignoring `<name>` placeholders.
function segments(name, prefix) {
	if (name === prefix) return [];
	return name.slice(prefix.length + 1).split('.').filter((s) => s !== '<name>');
}

// Label a section by the path its options share, so `no` reads as `no.motion`.
function sectionLabel(section, opts, prefix) {
	if (section === 'General') return section;
	const paths = opts.map(([n]) => segments(n, prefix));
	const shared = [];
	for (let i = 0; paths.every((p) => p.length > i && p[i] === paths[0][i]); i++) {
		shared.push(paths[0][i]);
	}
	return shared.join('.') || section;
}

function renderPage(page, entries, order) {
	// A segment gets its own section only when it holds two or more options.
	const tally = new Map();
	for (const [n] of entries) {
		const first = segments(n, page.prefix)[0];
		tally.set(first, (tally.get(first) || 0) + 1);
	}
	const parents = new Set([...tally].filter(([k, c]) => k && c > 1).map(([k]) => k));
	const sections = new Map();
	for (const [name, opt] of entries) {
		const first = segments(name, page.prefix)[0];
		const key = parents.has(first) ? first : 'General';
		if (!sections.has(key)) sections.set(key, []);
		sections.get(key).push([name, opt]);
	}
	const ordered = [...sections.entries()].sort(([a], [b]) =>
		a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b),
	);

	let md = `---\ntitle: ${page.title}\ndescription: ${JSON.stringify(page.description)}\nsidebar:\n  order: ${order}\n---\n\n`;
	md += `<!-- Generated by scripts/gen-options.mjs from hooks/*.json. Edit the Nix option, not this file. -->\n\n`;
	md += `${page.description} ${entries.length} options.\n\n`;
	for (const [section, opts] of ordered) {
		if (ordered.length > 1) md += `## ${sectionLabel(section, opts, page.prefix)}\n\n`;
		for (const [name, opt] of opts) md += renderOption(name, opt);
	}
	return md;
}

function renderIndex(counts, total) {
	let md = `---\ntitle: All options\ndescription: Every NixOS option zigduck declares, generated from the module source.\nsidebar:\n  order: 0\n---\n\n`;
	md += `<!-- Generated by scripts/gen-options.mjs from hooks/*.json. -->\n\n`;
	md += `zigduck declares ${total} NixOS options. These pages are generated from the module source on every build, so they always match the release.\n\n`;
	md += `Use the search box at the top of the page to jump to an option by name, or browse by area:\n\n`;
	md += `| Area | Options | What it covers |\n| --- | --- | --- |\n`;
	for (const { page, count } of counts) {
		md += `| [\`${page.title}\`](./${page.slug}/) | ${count} | ${page.description} |\n`;
	}
	md += `\nOption names containing \`<name>\` are attribute sets: replace \`<name>\` with your own key, such as a room name or a device's IEEE address.\n`;
	return md;
}

const options = load();
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const names = Object.keys(options).sort();
const claimed = new Set();
const counts = [];
pages.forEach((page, i) => {
	const entries = names
		.filter((n) => under(n, page.prefix) && !(page.exclude || []).some((x) => under(n, x)))
		.map((n) => [n, options[n]]);
	entries.forEach(([n]) => claimed.add(n));
	if (!entries.length) return;
	writeFileSync(join(outDir, `${page.slug}.md`), renderPage(page, entries, i + 1));
	counts.push({ page, count: entries.length });
});

const unclaimed = names.filter((n) => !claimed.has(n));
if (unclaimed.length) {
	console.warn(`gen-options: ${unclaimed.length} options have no page:\n  ${unclaimed.join('\n  ')}`);
}

writeFileSync(join(outDir, 'index.md'), renderIndex(counts, names.length));
console.log(`gen-options: wrote ${counts.length} pages, ${claimed.size} options`);
