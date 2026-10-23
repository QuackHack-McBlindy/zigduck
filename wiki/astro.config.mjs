// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { repo, branch, site, base } from './site.config.mjs';

// https://astro.build/config
export default defineConfig({
	site,
	base,
	integrations: [
		starlight({
			title: 'zigduck',
			description:
				'Declarative full-stack Zigbee home automation for NixOS. Nix for configuration, Rust for the runtime.',
			logo: { src: './src/assets/duck-mark.png', alt: 'zigduck' },
			favicon: '/favicon.png',
			social: [{ icon: 'github', label: 'GitHub', href: repo }],
			editLink: { baseUrl: `${repo}/edit/${branch}/wiki/` },
			customCss: ['./src/styles/custom.css'],
			lastUpdated: true,
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ slug: 'getting-started/introduction' },
						{ slug: 'getting-started/installation' },
						{ slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Configuration',
					items: [
						{ slug: 'configuration/zigbee' },
						{ slug: 'configuration/rooms' },
						{ slug: 'configuration/devices' },
						{ slug: 'configuration/dimmers-and-motion' },
						{ slug: 'configuration/scenes' },
						{ slug: 'configuration/automations' },
						{ slug: 'configuration/media' },
						{ slug: 'configuration/dashboard' },
						{ slug: 'configuration/voice' },
					],
				},
				{
					label: 'Usage',
					items: [
						{ slug: 'usage/zigduck-cli' },
						{ slug: 'usage/tv' },
						{ slug: 'usage/gnome-extension' },
						{ slug: 'usage/api' },
					],
				},
				{
					label: 'Option reference',
					items: [{ autogenerate: { directory: 'reference/options' } }],
				},
				{
					label: 'Project',
					items: [
						{ slug: 'project/contributing' },
						{ label: 'Changelog', link: `${repo}/blob/${branch}/CHANGELOG.md`, attrs: { target: '_blank' } },
					],
				},
			],
		}),
	],
});
