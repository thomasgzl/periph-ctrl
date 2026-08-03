<script setup lang="ts">
import type { PeripheralDevice } from '@/services/hid'

const props = defineProps<{ device: PeripheralDevice }>()

const CONNECTION_LABEL: Record<PeripheralDevice['connection'], string> = {
  usb: 'USB',
  wireless: 'Sans-fil',
  bluetooth: 'Bluetooth',
}

const label = CONNECTION_LABEL[props.device.connection]
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-text-dim">
    <span class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
      <span
        class="size-1.5 rounded-full"
        :class="device.connected ? 'bg-emerald-400' : 'bg-red-400'"
      />
      {{ label }}
    </span>

    <span v-if="device.batteryPercent !== undefined" class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
      <span class="relative h-2 w-4 rounded-xs border border-current">
        <span
          class="absolute inset-y-0 left-0 rounded-[1px] bg-current"
          :style="{ width: `${device.batteryPercent}%` }"
        />
      </span>
      {{ device.batteryPercent }}%
    </span>
  </div>
</template>
