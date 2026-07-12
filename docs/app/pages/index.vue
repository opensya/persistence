<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
import { findPageHeadline } from '@nuxt/content/utils';
import 'instantsearch.css/themes/satellite-min.css';

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation');
const siteConfig = useSiteConfig();

const { data: page } = await useAsyncData('index', () =>
  queryCollection('landing').path('/').first(),
);

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  });
}

const title = page.value.seo?.title || page.value.title;
const description = page.value.seo?.description || page.value.description;

const headline = computed(() =>
  findPageHeadline(navigation?.value, page.value?.path, { indexAsChild: true }),
);

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description,
});

defineOgImage('Docs.takumi', {
  title,
  description,
  headline: headline.value,
  siteUrl: siteConfig.url,
});
</script>

<template>
  <UContainer v-if="page" class="max-w-4xl pt-20 pb-16">
    <ContentRenderer :value="page" />
  </UContainer>
</template>
