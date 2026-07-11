<script setup lang="ts">
import { useClipboard } from '@vueuse/core';

const route = useRoute();
const toast = useToast();
const { copy, copied } = useClipboard();
const site = useSiteConfig();

const mdPath = computed(() => `${site.url}/raw${route.path}.md`);

const items = [
  {
    label: 'Copy page',
    icon: 'i-tabler-link',
    description: 'Copy page as markdown for LLMs',
    onSelect() {
      copy(mdPath.value);
      toast.add({
        title: 'Copied to clipboard',
        icon: 'i-tabler-circle-check-filled',
      });
    },
  },
  {
    label: 'View as Markdown',
    description: 'View this page as plain text',
    icon: 'i-tabler-markdown',
    target: '_blank',
    to: `/raw${route.path}.md`,
  },
  // {
  //   label: 'Open in ChatGPT',
  //   icon: 'i-simple-icons:openai',
  //   target: '_blank',
  //   to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read ${mdPath.value} so I can ask questions about it.`)}`
  // },
  // {
  //   label: 'Open in Claude',
  //   icon: 'i-simple-icons:anthropic',
  //   target: '_blank',
  //   to: `https://claude.ai/new?q=${encodeURIComponent(`Read ${mdPath.value} so I can ask questions about it.`)}`
  // }
];

async function copyPage() {
  copy(await $fetch<string>(`/raw${route.path}.md`));
}
</script>

<template>
  <UFieldGroup>
    <UButton
      label="Copy page"
      :icon="copied ? 'i-tabler-circle-check-filled' : 'i-tabler-copy'"
      color="neutral"
      variant="outline"
      :ui="{
        leadingIcon: [copied ? 'text-primary' : 'text-neutral', 'size-3.5'],
      }"
      @click="copyPage"
    />
    <UDropdownMenu
      :items="items"
      :content="{
        align: 'end',
        side: 'bottom',
        sideOffset: 8,
      }"
      :ui="{}"
    >
      <UButton
        icon="i-lucide-chevron-down"
        size="sm"
        color="neutral"
        variant="outline"
        aria-label="Open copy actions menu"
      />
    </UDropdownMenu>
  </UFieldGroup>
</template>
