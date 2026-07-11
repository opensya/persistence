// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    'nuxt-og-image',
    'nuxt-llms',
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/sitemap',
    '@nuxtjs/algolia',
    'motion-v/nuxt',
  ],

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      meta: [
        { name: 'algolia-site-verification', content: '8D33EE3FC8C49066' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1,
        },
      },
    },
    experimental: {
      sqliteConnector: 'native',
    },
  },

  routeRules: {
    '/_og/**': {
      prerender: false,
    },
  },

  experimental: {
    asyncContext: true,
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      autoSubfolderIndex: false,
    },
  },

  vite: {
    optimizeDeps: {
      include: ['@vueuse/core'],
    },
  },

  algolia: {
    applicationId: process.env.NUXT_PUBLIC_ALGOLIA_APP_ID!,
    apiKey: process.env.NUXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!,

    docSearch: {
      applicationId: process.env.NUXT_PUBLIC_ALGOLIA_APP_ID!,
      apiKey: process.env.NUXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
      indexName: process.env.NUXT_PUBLIC_ALGOLIA_INDEX_NAME,
      placeholder: 'Search ...',
    },
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
    },
  },

  icon: {
    provider: 'iconify',
  },

  llms: {
    domain: 'https://docs-template.nuxt.dev/',
    title: 'Nuxt Docs Template',
    description:
      'A template for building documentation with Nuxt UI and Nuxt Content.',
    full: {
      title: 'Nuxt Docs Template - Full Documentation',
      description: 'This is the full documentation for the Nuxt Docs Template.',
    },
    sections: [
      {
        title: 'Getting Started',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/getting-started%' },
        ],
      },
      {
        title: 'Essentials',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/essentials%' },
        ],
      },
    ],
  },

  mcp: {
    name: 'Docs template',
  },

  ogImage: {
    zeroRuntime: true,
  },
});
