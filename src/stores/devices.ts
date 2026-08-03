import { defineStore } from 'pinia'
import { getActiveDriver, type DeviceSetting, type PeripheralDevice } from '@/services/hid'

interface State {
  devices: PeripheralDevice[]
  scanning: boolean
  hasScanned: boolean
  savingSettingIds: Set<string>
  lastSavedSettingId: string | null
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
      if (!device || !setting) return

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
  },
})
