<script setup lang="ts"></script>

<template>
  <div class="flex">
    <div>
      <AppNavigation
        class="hidden lg:flex h-screen sticky top-0 overflow-y-auto border-e border-default w-70 bg-default"
      >
        <template #top>
          <div
            class="border-b border-default sticky top-0 z-10 h-(--ui-header-height) flex items-center px-5 gap-3"
          >
            <NuxtLink to="https://opensya.com" target="_blank">
              <AppFavicon
                class="text-primary size-6"
                :arrow-stroke-width="1.8"
              />
            </NuxtLink>

            <USeparator
              orientation="vertical"
              class="h-7"
              color="neutral"
              size="sm"
            />

            <NuxtLink to="/" class="text-lg font-bold"> Persistence </NuxtLink>
          </div>
        </template>
      </AppNavigation>
    </div>

    <slot />
  </div>
</template>
