<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation');

const { header } = useAppConfig();
</script>

<template>
  <UHeader
    :ui="{ center: 'flex-1', container: 'max-w-full' }"
    :to="header?.to || '/'"
    class="bg-transparent"
    mode="slideover"
  >
    <template #title>
      <NuxtLink :to="header?.to || '/'">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <template #right>
      <AlgoliaDocSearch v-if="header?.search" />

      <UColorModeButton v-if="header?.colorMode" />

      <template v-if="header?.links">
        <UButton
          v-for="(link, index) of header.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>

    <template #body>
      <UContentNavigation highlight :navigation="navigation" type="single">
        <template #link-trailing="{ link }">
          <u-icon
            v-if="link?.children?.length"
            name="i-lucide-plus"
            class="transition-all group-data-[state=open]:rotate-45"
            :class="{ 'rotate-45': link.open }"
          />
        </template>
      </UContentNavigation>
    </template>
  </UHeader>
</template>
