<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { pulseSaved } from '@/composables/animations'
import { useDeviceStore } from '@/stores/devices'
import type { DeviceSetting, RgbEffect } from '@/services/hid'

const props = defineProps<{ deviceId: string; setting: DeviceSetting; disabled?: boolean }>()

const store = useDeviceStore()
const checkEl = ref<HTMLElement | null>(null)

const key = `${props.deviceId}:${props.setting.id}`
let debounceHandle: ReturnType<typeof setTimeout> | undefined

function commit(value: DeviceSetting['value'], immediate = false) {
  clearTimeout(debounceHandle)
  const write = () => store.updateSetting(props.deviceId, props.setting.id, value)
  if (immediate) void write()
  else debounceHandle = setTimeout(write, 400)
}

function onRangeInput(event: Event) {
  if (props.setting.kind !== 'range') return
  const value = Number((event.target as HTMLInputElement).value)
  props.setting.value = value
  commit(value)
}

function onColorInput(event: Event) {
  if (props.setting.kind !== 'color') return
  const value = (event.target as HTMLInputElement).value
  props.setting.value = value
  commit(value)
}

function onEnumSelect(value: string) {
  if (props.setting.kind !== 'enum') return
  props.setting.value = value
  commit(value, true)
}

function onToggle() {
  if (props.setting.kind !== 'toggle') return
  props.setting.value = !props.setting.value
  commit(props.setting.value, true)
}

const EFFECT_OPTIONS: { value: RgbEffect; label: string }[] = [
  { value: 'off', label: 'Éteint' },
  { value: 'static', label: 'Statique' },
  { value: 'breathing', label: 'Respiration' },
  { value: 'wave', label: 'Vague' },
  { value: 'reactive', label: 'Réactif' },
]

function setColorEffect(effect: RgbEffect) {
  if (props.setting.kind !== 'color') return
  props.setting.effect = effect
  commit(props.setting.value, true)
}

watch(
  () => store.lastSavedSettingId,
  (id) => {
    if (id === key) pulseSaved(checkEl.value)
  },
)
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-white/5 py-4 last:border-0" :class="{ 'opacity-40': disabled }">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-text-h">{{ setting.label }}</p>
        <p v-if="setting.description" class="text-xs text-text-dim">{{ setting.description }}</p>
      </div>

      <div class="flex h-4 items-center text-accent-2">
        <Icon v-if="store.isSaving(deviceId, setting.id)" name="refresh" class="animate-spin text-sm" />
        <span v-else ref="checkEl" class="inline-flex opacity-0">
          <Icon name="check" class="text-sm" />
        </span>
      </div>
    </div>

    <!-- range -->
    <div v-if="setting.kind === 'range'" class="flex items-center gap-3">
      <input
        type="range"
        class="accent-ring h-1.5 flex-1 appearance-none rounded-full bg-white/10 accent-accent disabled:cursor-not-allowed"
        :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
        :disabled="disabled"
        :min="setting.min"
        :max="setting.max"
        :step="setting.step"
        :value="setting.value"
        @input="onRangeInput"
      />
      <span class="w-16 shrink-0 text-right text-sm tabular-nums text-text-dim">
        {{ setting.value }}{{ setting.unit ?? '' }}
      </span>
    </div>

    <!-- color -->
    <div v-else-if="setting.kind === 'color'" class="flex flex-wrap items-center gap-3">
      <input
        type="color"
        class="accent-ring size-9 rounded-lg border border-white/10 bg-transparent p-0"
        :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
        :disabled="disabled"
        :value="setting.value"
        @input="onColorInput"
      />
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="opt in EFFECT_OPTIONS"
          :key="opt.value"
          type="button"
          :disabled="disabled"
          class="accent-ring rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed"
          :class="setting.effect === opt.value
            ? 'border-accent/60 bg-accent/15 text-text-h'
            : 'border-white/10 text-text-dim hover:border-white/20'"
          @click="setColorEffect(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- enum -->
    <div v-else-if="setting.kind === 'enum'" class="flex flex-wrap gap-1.5">
      <button
        v-for="opt in setting.options"
        :key="opt.value"
        type="button"
        :disabled="disabled"
        class="accent-ring rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed"
        :class="setting.value === opt.value
          ? 'border-accent/60 bg-accent/15 text-text-h'
          : 'border-white/10 text-text-dim hover:border-white/20'"
        @click="onEnumSelect(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- toggle -->
    <button
      v-else-if="setting.kind === 'toggle'"
      type="button"
      :disabled="disabled"
      class="accent-ring flex w-11 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed"
      :class="setting.value ? 'bg-accent' : 'bg-white/10'"
      @click="onToggle"
    >
      <span
        class="size-4 rounded-full bg-white transition-transform"
        :class="setting.value ? 'translate-x-5' : 'translate-x-0'"
      />
    </button>
  </div>
</template>
