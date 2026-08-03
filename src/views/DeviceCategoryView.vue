<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
import ConnectionBadge from '@/components/device/ConnectionBadge.vue'
import SettingControl from '@/components/device/SettingControl.vue'
import SupportBadge from '@/components/device/SupportBadge.vue'
import { useStaggerReveal } from '@/composables/animations'
import { CATEGORY_META } from '@/constants/categories'
import { useDeviceStore } from '@/stores/devices'
import { AKKO_VENDOR_ID } from '@/services/hid/webhid/akko'
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

    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="flex size-10 items-center justify-center rounded-xl bg-white/5 text-xl text-accent-2">
          <Icon :name="meta.icon" />
        </span>
        <h1 class="text-2xl font-semibold">{{ meta.label }}</h1>
      </div>

      <button
        v-if="category === 'keyboard'"
        type="button"
        class="accent-ring glass-panel flex items-center gap-2 px-4 py-2 text-sm text-text-h transition-colors hover:border-accent/40 disabled:opacity-50"
        :disabled="store.connectingKeyboard"
        @click="store.connectKeyboard()"
      >
        <Icon name="refresh" :class="{ 'animate-spin': store.connectingKeyboard }" />
        {{ store.connectingKeyboard ? 'Connexion…' : 'Connecter un clavier réel (WebHID)' }}
      </button>
    </header>

    <p
      v-if="category === 'keyboard' && store.keyboardConnectError"
      class="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
    >
      {{ store.keyboardConnectError }}
    </p>

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
          <div class="flex flex-wrap items-center gap-2">
            <ConnectionBadge :device="device" />
            <SupportBadge :level="device.supportLevel" />
          </div>
        </div>

        <p
          v-if="device.supportNote"
          class="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-text-dim"
        >
          {{ device.supportNote }}
        </p>

        <div v-if="device.diagnostics?.length" class="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
          <p class="mb-1.5 text-xs font-medium text-text-h">Diagnostic de connexion</p>
          <p v-for="(line, i) in device.diagnostics" :key="i" class="font-mono text-xs text-text-dim">
            {{ line }}
          </p>
        </div>

        <div
          v-if="device.vendorId === AKKO_VENDOR_ID"
          class="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3"
        >
          <p class="mb-2 text-xs text-text-dim">
            Un bug dans le test précédent a coupé le RGB (décalage d'octet dans la reconstruction de la trame,
            corrigé). Restaure l'état d'origine lu au tout premier GET_LEDPARAM, ou relance un test d'écriture propre.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="accent-ring rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-400/10 disabled:opacity-50"
              :disabled="store.testingAkkoWrite"
              @click="store.restoreAkkoLighting()"
            >
              {{ store.testingAkkoWrite ? 'Envoi…' : "Restaurer l'éclairage d'origine" }}
            </button>
            <button
              type="button"
              class="accent-ring rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-400/10 disabled:opacity-50"
              :disabled="store.testingAkkoWrite"
              @click="store.testAkkoRoundTrip()"
            >
              {{ store.testingAkkoWrite ? 'Envoi…' : "Tester l'écriture (renvoi à l'identique, corrigé)" }}
            </button>
          </div>
          <div v-if="store.akkoWriteTestResult?.length" class="mt-2 space-y-1">
            <p v-for="(line, i) in store.akkoWriteTestResult" :key="i" class="font-mono text-xs text-text-dim">
              {{ line }}
            </p>
          </div>
        </div>

        <div>
          <SettingControl
            v-for="setting in device.settings"
            :key="setting.id"
            :device-id="device.id"
            :setting="setting"
            :disabled="device.supportLevel !== 'full'"
          />
        </div>
      </section>
    </div>
  </div>
</template>
