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

/**
 * How far real (non-mock) control actually goes for this device, given what's
 * publicly reverse-engineered for its protocol:
 * - 'full': settings can be read and written.
 * - 'read-only': only status (e.g. battery) is confirmed reverse-engineered;
 *   settings are shown but can't be written yet.
 * - 'unsupported': device is detected, but nothing about its protocol is
 *   confirmed for this exact model yet.
 */
export type SupportLevel = 'full' | 'read-only' | 'unsupported'

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
  supportLevel: SupportLevel
  supportNote?: string
  /** Real USB identifiers, present once the device was picked via a real WebHID connection. */
  vendorId?: number
  productId?: number
  /** Raw protocol probe output shown to the user while a real driver is unverified. */
  diagnostics?: string[]
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
