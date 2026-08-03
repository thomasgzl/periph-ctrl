<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
import ConnectionBadge from '@/components/device/ConnectionBadge.vue'
import SettingControl from '@/components/device/SettingControl.vue'
import { useStaggerReveal } from '@/composables/animations'
import { CATEGORY_META } from '@/constants/categories'
import { useDeviceStore } from '@/stores/devices'
import type { DeviceCategory } from '@/services/hid'

const props = defineProps<{ category: DeviceCategory }>()

const store = useDeviceStore()
const list = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!store.hasScanned) store.scan()
})

useStaggerReveal(list, '.device-panel')

const devices = computed(() => store.byCategory(props.category))
const meta = computed(() => CATEGORY_META[props.category])
</script>

<template>
  <div>
    <RouterLink to="/" class="mb-4 inline-block text-sm text-text-dim hover:text-text-h">← Dashboard</RouterLink>

    <header class="mb-6 flex items-center gap-3">
      <span class="flex size-10 items-center justify-center rounded-xl bg-white/5 text-xl text-accent-2">
        <Icon :name="meta.icon" />
      </span>
      <h1 class="text-2xl font-semibold">{{ meta.label }}</h1>
    </header>

    <div v-if="store.scanning && devices.length === 0" class="py-16 text-center text-sm text-text-dim">
      Détection en cours…
    </div>

    <div v-else-if="devices.length === 0" class="glass-panel py-16 text-center text-sm text-text-dim">
      Aucun périphérique {{ meta.label.toLowerCase() }} détecté.
    </div>

    <div v-else ref="list" class="flex flex-col gap-6">
      <section v-for="device in devices" :key="device.id" class="device-panel glass-panel p-6">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-text-dim">{{ device.brand }}</p>
            <h2 class="text-lg font-medium text-text-h">{{ device.name }}</h2>
          </div>
          <ConnectionBadge :device="device" />
        </div>

        <div>
          <SettingControl
            v-for="setting in device.settings"
            :key="setting.id"
            :device-id="device.id"
            :setting="setting"
          />
        </div>
      </section>
    </div>
  </div>
</template>
