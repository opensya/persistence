<script setup lang="ts">
import 'instantsearch.css/themes/satellite-min.css';

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

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  // ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/docs-light.png',
});

// defineOgImage('Docs.takumi', { title, description, headline: headline.value });
</script>

<template>
  <UContainer v-if="page" class="max-w-4xl pt-20 pb-16">
    <ContentRenderer :value="page" />
  </UContainer>
</template>
