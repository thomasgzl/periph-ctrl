<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
import ConnectionBadge from '@/components/device/ConnectionBadge.vue'
import { CATEGORY_META } from '@/constants/categories'
import type { PeripheralDevice } from '@/services/hid'

defineProps<{ device: PeripheralDevice }>()
</script>

<template>
  <RouterLink
    :to="`/${device.category}`"
    class="reveal-item glass-panel accent-ring group flex flex-col gap-4 p-5 transition-colors hover:border-accent/40"
  >
    <div class="flex items-center gap-3">
      <span
        class="flex size-10 items-center justify-center rounded-xl bg-white/5 text-xl text-accent-2 transition-colors group-hover:text-accent"
      >
        <Icon :name="CATEGORY_META[device.category].icon" />
      </span>
      <div>
        <p class="text-sm text-text-dim">{{ device.brand }}</p>
        <h3 class="text-base font-medium text-text-h">{{ device.name }}</h3>
      </div>
    </div>

    <ConnectionBadge :device="device" />
  </RouterLink>
</template>
