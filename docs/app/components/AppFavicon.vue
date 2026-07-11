<script lang="ts" setup>
import { computed } from 'vue';

const {
  strokeWidth = 0,
  stroke = 'none',
  fill = 'currentColor',

  arrowStrokeWidth = 1,
  arrowStroke = 'currentColor',
} = defineProps<{
  strokeWidth?: number;
  stroke?: string;
  fill?: string;

  arrowStrokeWidth?: number;
  arrowStroke?: string;
}>();

const BASE_SIZE = 24;
const CORNER_RADII = { tl: 4, tr: 4, br: 4, bl: 10 };

const pad = computed(() => strokeWidth / 2);

const viewBox = computed(() => {
  const p = pad.value;
  const size = BASE_SIZE + p * 2;
  return `${-p} ${-p} ${size} ${size}`;
});

const pathD = computed(() => {
  const { tl, tr, br, bl } = CORNER_RADII;
  const s = BASE_SIZE;
  return [
    `M${tl} 0`,
    `H${s - tr}`,
    `Q${s} 0 ${s} ${tr}`,
    `V${s - br}`,
    `Q${s} ${s} ${s - br} ${s}`,
    `H${bl}`,
    `Q0 ${s} 0 ${s - bl}`,
    `V${tl}`,
    `Q0 0 ${tl} 0`,
    'Z',
  ].join(' ');
});
</script>

<template>
  <svg :viewBox="viewBox" width="100%" height="100%" preserveAspectRatio="none">
    <path
      :d="pathD"
      :stroke="stroke"
      :stroke-width="strokeWidth"
      :fill="fill"
      stroke-linejoin="round"
    />

    <path
      :stroke-width="arrowStrokeWidth"
      :stroke="arrowStroke"
      class="text-inverted"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M7 7h10v10M7 17L17 7"
    />
  </svg>
</template>
