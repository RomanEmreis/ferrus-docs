import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ferrus',
  tagline: 'Deterministic orchestration of AI agents for real software work.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Set the production url of your site here
  url: 'https://romanemreis.github.io',
  // For GitHub pages deployment under /<projectName>/
  baseUrl: '/ferrus-docs/',

  // GitHub pages deployment config.
  organizationName: 'RomanEmreis',
  projectName: 'ferrus-docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/RomanEmreis/ferrus-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ferrus-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'FERRUS',
      logo: {
        alt: 'ferrus',
        src: 'img/favicon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/quickstart',
          label: 'Quickstart',
          position: 'left',
        },
        {
          href: 'https://github.com/RomanEmreis/ferrus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/docs/quickstart'},
            {label: 'Configuration', to: '/docs/configuration'},
            {label: 'HQ Commands', to: '/docs/hq'},
            {label: 'State Machine', to: '/docs/state-machine'},
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/RomanEmreis/ferrus',
            },
            {
              label: 'crates.io',
              href: 'https://crates.io/crates/ferrus',
            },
            {
              label: 'Issues',
              href: 'https://github.com/RomanEmreis/ferrus/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'License (Apache 2.0)',
              href: 'https://github.com/RomanEmreis/ferrus/blob/main/LICENSE',
            },
            {
              label: 'Contributing',
              href: 'https://github.com/RomanEmreis/ferrus/blob/main/CONTRIBUTING.md',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ferrus · Apache-2.0`,
    },
    prism: {
      theme: prismThemes.vsDark,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['rust', 'toml', 'bash', 'powershell'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
