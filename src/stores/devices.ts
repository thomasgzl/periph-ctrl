import { defineStore } from 'pinia'
import { createAkkoKeyboardSettings } from '@/services/hid/akkoSettings'
import {
  AKKO_VENDOR_ID,
  connectAndProbeAkko,
  restoreKnownTac75Lighting,
  setAkkoLedColor,
  setAkkoRapidTrigger,
} from '@/services/hid/webhid/akko'
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
  },
})
