<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation');
</script>

<template>
  <div class="flex flex-col">
    <slot name="top" />

    <div class="py-5 px-2">
      <UContentNavigation
        highlight
        color="neutral"
        variant="link"
        type="multiple"
        :navigation="navigation"
        :ui="{ list: 'mx-0' }"
      >
        <template #link-trailing="{ link }">
          <u-icon
            v-if="link?.children?.length"
            name="i-tabler-chevron-right-filled"
            class="transition-all opacity-50 group-data-[state=open]:rotate-90"
            :class="{ 'rotate-90': link.open }"
          />
        </template>
      </UContentNavigation>
    </div>

    <div
      class="mt-auto sticky bottom-0 bg-default z-10 border-t border-t-default p-5 flex items-center gap-2"
    >
      <!-- <UButton
        icon="i-simple-icons-linkedin"
        variant="ghost"
        class="border border-default rounded-full"
        href="https://linkedin.com/in/domutala"
        target="_blank"
        square
      /> -->

      <UButton
        variant="ghost"
        class="border border-default rounded-4xl"
        icon="i-simple-icons-github"
        href="https://github.com/opensya/persistence"
        target="_blank"
      >
        Github
      </UButton>
    </div>
  </div>
</template>
