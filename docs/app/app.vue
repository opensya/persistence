<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core';

const { seo } = useAppConfig();

const { data: navigation } = await useAsyncData('navigation', () =>
  queryCollectionNavigation('docs'),
);

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.svg' }],
  htmlAttrs: {
    lang: 'en',
  },
});

useSeoMeta({
  titleTemplate: `%s - ${seo?.siteName}`,
  ogSiteName: seo?.siteName,
  twitterCard: 'summary_large_image',
});

const { t } = useMagicKeys();
const colorMode = useColorMode();

watch(
  () => t?.value,
  (v) => {
    if (v) {
      colorMode.preference =
        colorMode.preference === 'light' ? 'dark' : 'light';
    }
  },
);

provide('navigation', navigation);
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
