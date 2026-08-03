<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import DeviceCard from '@/components/device/DeviceCard.vue'
import { useStaggerReveal } from '@/composables/animations'
import { useDeviceStore } from '@/stores/devices'

const store = useDeviceStore()
const grid = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!store.hasScanned) store.scan()
})

useStaggerReveal(grid)
</script>

<template>
  <div>
    <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Tes périphériques</h1>
        <p class="mt-1 text-sm text-text-dim">
          {{ store.connectedCount }} / {{ store.devices.length }} connectés — tout en un, sans logiciel constructeur.
        </p>
      </div>

      <button
        type="button"
        class="accent-ring glass-panel flex items-center gap-2 px-4 py-2 text-sm text-text-h transition-colors hover:border-accent/40 disabled:opacity-50"
        :disabled="store.scanning"
        @click="store.scan()"
      >
        <Icon name="refresh" :class="{ 'animate-spin': store.scanning }" />
        {{ store.scanning ? 'Scan en cours…' : 'Rescanner' }}
      </button>
    </header>

    <div v-if="!store.hasScanned && store.scanning" class="py-16 text-center text-sm text-text-dim">
      Détection des périphériques connectés…
    </div>

    <div v-else ref="grid" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DeviceCard v-for="device in store.devices" :key="device.id" :device="device" />
    </div>
  </div>
</template>
