import { defineStore } from 'pinia'
import { createAkkoKeyboardSettings } from '@/services/hid/akkoSettings'
import { createPulsarMouseSettings } from '@/services/hid/pulsarSettings'
import {
  AKKO_VENDOR_ID,
  connectAndProbeAkko,
  restoreKnownTac75Lighting,
  setAkkoLedColor,
  setAkkoRapidTrigger,
} from '@/services/hid/webhid/akko'
import { attemptDpiRead, connectAndProbePulsar } from '@/services/hid/webhid/pulsar'
import { getActiveDriver, type DeviceSetting, type PeripheralDevice } from '@/services/hid'

interface State {
  devices: PeripheralDevice[]
  scanning: boolean
  hasScanned: boolean
  savingSettingIds: Set<string>
  lastSavedSettingId: string | null
  connectingKeyboard: boolean
  keyboardConnectError: string | null
  testingAkkoWrite: boolean
  akkoWriteTestResult: string[] | null
  akkoRapidTrigger: boolean
  connectingMouse: boolean
  mouseConnectError: string | null
  testingPulsarRead: boolean
  pulsarReadResult: string[] | null
}

const driver = getActiveDriver()

function settingKey(deviceId: string, settingId: string): string {
  return `${deviceId}:${settingId}`
}

export const useDeviceStore = defineStore('devices', {
  state: (): State => ({
    devices: [],
    scanning: false,
    hasScanned: false,
    savingSettingIds: new Set(),
    lastSavedSettingId: null,
    connectingKeyboard: false,
    keyboardConnectError: null,
    testingAkkoWrite: false,
    akkoWriteTestResult: null,
    akkoRapidTrigger: true,
    connectingMouse: false,
    mouseConnectError: null,
    testingPulsarRead: false,
    pulsarReadResult: null,
  }),
  getters: {
    byCategory: (state) => (category: PeripheralDevice['category']) =>
      state.devices.filter((d) => d.category === category),
    connectedCount: (state) => state.devices.filter((d) => d.connected).length,
  },
  actions: {
    async scan() {
      this.scanning = true
      try {
        this.devices = await driver.scan()
      } finally {
        this.scanning = false
        this.hasScanned = true
      }
    },
    isSaving(deviceId: string, settingId: string): boolean {
      return this.savingSettingIds.has(settingKey(deviceId, settingId))
    },
    async updateSetting(deviceId: string, settingId: string, value: DeviceSetting['value']) {
      const device = this.devices.find((d) => d.id === deviceId)
      const setting = device?.settings.find((s) => s.id === settingId)
      if (!device || !setting || device.supportLevel !== 'full') return

      const previous = setting.value
      setting.value = value

      const key = settingKey(deviceId, settingId)
      this.savingSettingIds.add(key)
      try {
        await driver.applySetting(deviceId, settingId, value)
        this.lastSavedSettingId = key
      } catch (error) {
        setting.value = previous
        throw error
      } finally {
        this.savingSettingIds.delete(key)
      }
    },
    /**
     * Opens the real browser HID device picker (must run from a click
     * handler — WebHID requires user activation) and replaces whatever
     * keyboard entry is currently shown with the real connected device.
     */
    async connectKeyboard() {
      if (!('hid' in navigator)) {
        this.keyboardConnectError = 'WebHID indisponible : utilise Chrome ou Edge sur ordinateur.'
        return
      }

      this.connectingKeyboard = true
      this.keyboardConnectError = null
      try {
        const result = await connectAndProbeAkko()
        if (!result) return // user cancelled the device picker

        const isAkko = result.vendorId === AKKO_VENDOR_ID
        const device: PeripheralDevice = {
          id: `keyboard-real-${result.vendorId}-${result.productId}`,
          name: result.productName || 'Clavier détecté',
          brand: isAkko ? 'Akko / MonsGeek' : 'Marque inconnue',
          category: 'keyboard',
          connection: 'usb',
          connected: true,
          vendorId: result.vendorId,
          productId: result.productId,
          supportLevel: 'unsupported',
          supportNote: isAkko
            ? "Vendor reconnu (Akko/MonsGeek, contrôleur RY5088). Écriture de la couleur RGB confirmée et fonctionnelle (voir ci-dessous) ; point d'activation, Rapid Trigger et taux de rafraîchissement restent non confirmés en écriture, d'où les réglages désactivés plus bas."
            : "Vendor non reconnu par Periph Ctrl — aucun pilote disponible pour ce périphérique pour l'instant.",
          diagnostics: result.diagnostics,
          settings: isAkko ? createAkkoKeyboardSettings() : [],
        }

        this.devices = [...this.devices.filter((d) => d.category !== 'keyboard'), device]
        this.hasScanned = true
      } catch (error) {
        this.keyboardConnectError = error instanceof Error ? error.message : String(error)
      } finally {
        this.connectingKeyboard = false
      }
    },
    /** Real, confirmed color write — frame layout captured from Akko's own official app. */
    async setAkkoColor(hex: string) {
      this.testingAkkoWrite = true
      try {
        this.akkoWriteTestResult = await setAkkoLedColor(hex)
      } finally {
        this.testingAkkoWrite = false
      }
    },
    /** Recovery from an earlier shift-bug that turned the RGB off during a write test. */
    async restoreAkkoLighting() {
      this.testingAkkoWrite = true
      try {
        this.akkoWriteTestResult = await restoreKnownTac75Lighting()
      } finally {
        this.testingAkkoWrite = false
      }
    },
    /** Real Rapid Trigger on/off toggle — confirmed bytes, sensitivity value still unconfirmed. */
    async toggleAkkoRapidTrigger() {
      const next = !this.akkoRapidTrigger
      this.testingAkkoWrite = true
      try {
        this.akkoWriteTestResult = await setAkkoRapidTrigger(next)
        this.akkoRapidTrigger = next
      } finally {
        this.testingAkkoWrite = false
      }
    },
    /**
     * Opens the real browser HID device picker for Pulsar mice. Detection +
     * interface introspection only — no protocol confirmed yet for the
     * user's exact model, so no read/write is attempted.
     */
    async connectMouse() {
      if (!('hid' in navigator)) {
        this.mouseConnectError = 'WebHID indisponible : utilise Chrome ou Edge sur ordinateur.'
        return
      }

      this.connectingMouse = true
      this.mouseConnectError = null
      try {
        const result = await connectAndProbePulsar()
        if (!result) return // user cancelled the device picker

        const device: PeripheralDevice = {
          id: `mouse-real-${result.vendorId}-${result.productId}`,
          name: result.productName || 'Souris détectée',
          brand: 'Pulsar',
          category: 'mouse',
          connection: 'wireless',
          connected: true,
          vendorId: result.vendorId,
          productId: result.productId,
          supportLevel: 'unsupported',
          supportNote:
            "Vendor Pulsar détecté. Contrairement à Akko, Pulsar n'a pas de configurateur web officiel à observer, donc le protocole exact n'est pas encore confirmé pour ce modèle — aucune lecture/écriture DPI tentée pour l'instant.",
          diagnostics: result.diagnostics,
          settings: createPulsarMouseSettings(),
        }

        this.devices = [...this.devices.filter((d) => d.category !== 'mouse'), device]
        this.hasScanned = true
      } catch (error) {
        this.mouseConnectError = error instanceof Error ? error.message : String(error)
      } finally {
        this.connectingMouse = false
      }
    },
    /**
     * Calculated-risk, read-only DPI query attempt using the community doc's
     * fragmentary (and unconfirmed for this exact VID) category/register
     * description. Never sends the write register (0x84) — see
     * attemptDpiRead()'s own comment for the full caveat.
     */
    async attemptPulsarDpiRead() {
      this.testingPulsarRead = true
      try {
        this.pulsarReadResult = await attemptDpiRead()
      } finally {
        this.testingPulsarRead = false
      }
    },
  },
})
