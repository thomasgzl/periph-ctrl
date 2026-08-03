export type DeviceCategory = 'mouse' | 'keyboard' | 'headset' | 'webcam'

export type ConnectionType = 'usb' | 'wireless' | 'bluetooth'

export type RgbEffect = 'static' | 'breathing' | 'wave' | 'reactive' | 'off'

interface SettingBase {
  id: string
  label: string
  description?: string
}

export interface RangeSetting extends SettingBase {
  kind: 'range'
  min: number
  max: number
  step: number
  value: number
  unit?: string
}

export interface ColorSetting extends SettingBase {
  kind: 'color'
  value: string
  effect: RgbEffect
}

export interface EnumOption {
  value: string
  label: string
}

export interface EnumSetting extends SettingBase {
  kind: 'enum'
  options: EnumOption[]
  value: string
}

export interface ToggleSetting extends SettingBase {
  kind: 'toggle'
  value: boolean
}

export type DeviceSetting = RangeSetting | ColorSetting | EnumSetting | ToggleSetting

export interface PeripheralDevice {
  id: string
  name: string
  brand: string
  category: DeviceCategory
  connection: ConnectionType
  connected: boolean
  batteryPercent?: number
  firmwareVersion?: string
  settings: DeviceSetting[]
}

/**
 * Contract every hardware backend must satisfy: today only MockDriver
 * implements it, but a WebHID-based driver per brand (Logitech HID++,
 * OpenRazer, ...) can be swapped in later without touching the UI layer.
 */
export interface DeviceDriver {
  readonly name: string
  isSupported(): boolean
  scan(): Promise<PeripheralDevice[]>
  applySetting(deviceId: string, settingId: string, value: DeviceSetting['value']): Promise<void>
}
