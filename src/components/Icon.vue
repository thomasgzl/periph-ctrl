<script setup lang="ts">
export type IconName = 'mouse' | 'keyboard' | 'headset' | 'webcam' | 'grid' | 'check' | 'refresh'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="size-[1em]"
    aria-hidden="true"
  >
    <template v-if="name === 'mouse'">
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <rect x="11" y="5.5" width="2" height="3" rx="1" />
    </template>

    <template v-else-if="name === 'keyboard'">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <rect x="4.5" y="9" width="1.6" height="1.6" />
      <rect x="7.5" y="9" width="1.6" height="1.6" />
      <rect x="10.5" y="9" width="1.6" height="1.6" />
      <rect x="13.5" y="9" width="1.6" height="1.6" />
      <rect x="16.5" y="9" width="1.6" height="1.6" />
      <rect x="8" y="14" width="8" height="1.8" rx="0.9" />
    </template>

    <template v-else-if="name === 'headset'">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2" y="12" width="4" height="7" rx="1.6" />
      <rect x="18" y="12" width="4" height="7" rx="1.6" />
    </template>

    <template v-else-if="name === 'webcam'">
      <circle cx="12" cy="10" r="6" />
      <circle cx="12" cy="10" r="2" />
      <path d="M8.5 19h7" />
      <path d="M12 16v3" />
    </template>

    <template v-else-if="name === 'grid'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </template>

    <template v-else-if="name === 'check'">
      <path d="M5 13l4 4L19 7" />
    </template>

    <template v-else-if="name === 'refresh'">
      <path d="M4 12a8 8 0 1 1 2.657 5.963" />
      <path d="M4 12v5h5" />
    </template>
  </svg>
</template>
