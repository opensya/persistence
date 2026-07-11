<script setup lang="ts">
defineOptions({ inheritAttrs: false, island: false });

withDefaults(
  defineProps<{
    headline?: string;
    title?: string;
    description?: string;
    siteUrl?: string;
  }>(),
  {
    siteUrl: 'docs.opensya.com',
  },
);

// const siteConfig = useSiteConfig();
</script>

<template>
  <div
    class="w-full h-full flex relative overflow-hidden bg-neutral-950"
    data-theme="dark"
  >
    <div class="flex flex-col justify-between flex-1 px-20 py-16">
      <div />

      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-2 group/logo select-none mb-5">
          <AppFavicon
            class="text-highlighted size-8"
            :arrow-stroke-width="1.8"
          />

          <div class="font-light text-[22px] text-highlighted">OpenSya</div>
        </div>

        <span v-if="headline" class="text-2xl font-medium text-primary-400">
          {{ headline }}
        </span>

        <h1 v-if="title" class="text-6xl font-bold text-highlighted">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="text-3xl/11 text-muted"
          :style="{ lineClamp: 2, textOverflow: 'ellipsis' }"
        >
          {{ description }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <span class="text-xl text-dimmed ml-auto">
          {{ siteUrl.replace(/^https?:\/\//i, '') }}
        </span>
      </div>
    </div>
  </div>
</template>
