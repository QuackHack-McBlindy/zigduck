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
					items: [{ autogenerate: { directory: 'getting-started' } }],
				},
				{
					label: 'Configuration',
					items: [{ autogenerate: { directory: 'configuration' } }],
				},
				{
					label: 'Usage',
					items: [{ autogenerate: { directory: 'usage' } }],
				},
				{
					label: 'Option reference',
					items: [{ autogenerate: { directory: 'reference/options' } }],
				},
				{
					label: 'Share',
					items: [{ autogenerate: { directory: 'share' } }],
				},
				{
					label: 'Project',
					items: [
						{ autogenerate: { directory: 'project' } },
						{ label: 'Changelog', link: `${repo}/blob/${branch}/CHANGELOG.md`, attrs: { target: '_blank' } },
					],
				},
			],
		}),
	],
});
