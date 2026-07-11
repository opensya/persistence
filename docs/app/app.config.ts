export default defineAppConfig({
  ui: {
    colors: {
      primary: 'black',
      neutral: 'neutral',
    },

    icons: {
      arrowDown: 'i-tabler-arrow-down',
      arrowLeft: 'i-tabler-arrow-left',
      arrowRight: 'i-tabler-arrow-right',
      arrowUp: 'i-tabler-arrow-up',
      caution: 'i-tabler-alert-square-rounded',
      check: 'i-tabler-check',
      chevronDoubleLeft: 'i-tabler-chevrons-left',
      chevronDoubleRight: 'i-tabler-chevrons-right',
      chevronDown: 'i-tabler-chevron-down',
      chevronLeft: 'i-tabler-chevron-left',
      chevronRight: 'i-tabler-chevron-right',
      chevronUp: 'i-tabler-chevron-up',
      close: 'i-tabler-x',
      copy: 'i-tabler-copy',
      copyCheck: 'i-tabler-circle-check-filled',
      dark: 'i-tabler-moon',
      drag: 'i-tabler-grip-vertical',
      ellipsis: 'i-tabler-dots',
      error: 'i-tabler-square-rounded-x',
      external: 'i-tabler-arrow-up-right',
      eye: 'i-tabler-eye',
      eyeOff: 'i-tabler-eye-off',
      file: 'i-tabler-file',
      folder: 'i-tabler-folder',
      folderOpen: 'i-tabler-folder-open',
      hash: 'i-tabler-hash',
      info: 'i-tabler-info-square-rounded',
      light: 'i-tabler-sun',
      loading: 'i-tabler-loader-2',
      menu: 'i-tabler-menu',
      minus: 'i-tabler-minus',
      panelClose: 'i-tabler-layout-sidebar-left-collapse',
      panelOpen: 'i-tabler-layout-sidebar-left-expand',
      plus: 'i-tabler-plus',
      reload: 'i-tabler-reload',
      search: 'i-tabler-search',
      stop: 'i-tabler-player-stop',
      star: 'i-tabler-star',
      success: 'i-tabler-square-rounded-check',
      system: 'i-tabler-device-desktop',
      tip: 'i-tabler-bulb',
      upload: 'i-tabler-upload',
      warning: 'i-tabler-alert-triangle',
    },

    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted',
      },
    },

    prose: {
      codeGroup: {
        base: 'bg-default rounded-xl',
        slots: {
          list: 'rounded-t-xl bg-muted',
          indicator: 'bg-accented',
          trigger: 'cursor-pointer hover:bg-accented',
        },
      },

      pre: {
        base: 'bg-default rounded-xl',

        slots: {
          header: 'rounded-t-xl bg-muted',
        },
      },
    },

    pageCard: {
      variants: {
        variant: {
          soft: {
            root: 'bg-elevated dark:bg-elevated/50',
            spotlight: 'bg-elevated/90',
          },
          subtle: {
            root: 'bg-elevated dark:bg-elevated/50',
            spotlight: 'bg-elevated/90',
          },
        },
      },
    },

    card: {
      variants: {
        variant: {
          soft: {
            root: 'bg-elevated dark:bg-elevated/50',
            spotlight: 'bg-elevated/90',
          },
          subtle: {
            root: 'bg-elevated dark:bg-elevated/50',
            spotlight: 'bg-elevated/90',
          },
        },
      },
    },
  },

  seo: {
    siteName: 'OpenSya Peristence',
  },

  header: {
    title: '',
    to: '/',
    logo: {
      alt: '',
      light: '',
      dark: '',
    },
    search: true,
    colorMode: true,
    links: [
      {
        icon: 'i-simple-icons-github',
        to: 'https://github.com/opensya',
        target: '_blank',
        'aria-label': 'GitHub',
      },
    ],
  },

  footer: {
    credits: `© ${new Date().getFullYear()}`,
    colorMode: false,
    links: [
      {
        icon: 'i-simple-icons-linkedin',
        to: 'https://linkedin.com/in/domutala',
        target: '_blank',
        'aria-label': 'Opensya on LinkedIN',
      },
      {
        icon: 'i-simple-icons-github',
        to: 'https://github.com/opensya/persistence',
        target: '_blank',
        'aria-label': 'Opensya on GitHub',
      },
    ],
  },

  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/opensya/persistence/edit/main/content',
      issue: ' https://github.com/opensya/persistence/issues/new/choose',

      links: [
        {
          icon: 'i-lucide-star',
          label: 'Star on GitHub',
          to: 'https://github.com/nuxt/ui',
          target: '_blank',
        },
        // {
        //   icon: 'i-lucide-book-open',
        //   label: 'Nuxt UI docs',
        //   to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
        //   target: '_blank',
        // },
      ],
    },
  },
});
