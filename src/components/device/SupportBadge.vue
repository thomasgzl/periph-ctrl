<script setup lang="ts">
import type { SupportLevel } from '@/services/hid'

defineProps<{ level: SupportLevel }>()

const LABEL: Record<SupportLevel, string> = {
  full: 'Contrôle complet',
  'read-only': 'Lecture seule',
  unsupported: 'Pas encore supporté',
}

const CLASSES: Record<SupportLevel, string> = {
  full: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  'read-only': 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  unsupported: 'border-red-400/30 bg-red-400/10 text-red-300',
}
</script>

<template>
  <span class="rounded-full border px-2 py-1 text-xs" :class="CLASSES[level]">
    {{ LABEL[level] }}
  </span>
</template>
