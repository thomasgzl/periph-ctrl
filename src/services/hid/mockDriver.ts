import type { DeviceDriver, PeripheralDevice } from './types'

function clone(devices: PeripheralDevice[]): PeripheralDevice[] {
  return devices.map((d) => ({ ...d, settings: d.settings.map((s) => ({ ...s })) }))
}

const template: PeripheralDevice[] = [
  {
    id: 'mouse-g502x',
    name: 'G502 X Plus',
    brand: 'Logitech',
    category: 'mouse',
    connection: 'wireless',
    connected: true,
    batteryPercent: 74,
    firmwareVersion: '12.4',
    settings: [
      { id: 'dpi', kind: 'range', label: 'Sensibilité (DPI)', min: 100, max: 32000, step: 50, value: 1600 },
      {
        id: 'polling',
        kind: 'enum',
        label: 'Taux de rafraîchissement',
        value: '1000',
        options: [
          { value: '125', label: '125 Hz' },
          { value: '500', label: '500 Hz' },
          { value: '1000', label: '1000 Hz' },
          { value: '4000', label: '4000 Hz (LIGHTSPEED)' },
        ],
      },
      { id: 'rgb', kind: 'color', label: 'Éclairage logo', value: '#aa3bff', effect: 'breathing' },
      {
        id: 'liftoff',
        kind: 'enum',
        label: "Distance de décollage",
        value: 'low',
        options: [
          { value: 'low', label: 'Basse (~1mm)' },
          { value: 'mid', label: 'Moyenne (~2mm)' },
          { value: 'high', label: 'Haute (~3mm)' },
        ],
      },
    ],
  },
  {
    id: 'keyboard-huntsman-v3-pro',
    name: 'Huntsman V3 Pro',
    brand: 'Razer',
    category: 'keyboard',
    connection: 'usb',
    connected: true,
    firmwareVersion: '3.02',
    settings: [
      {
        id: 'actuation',
        kind: 'range',
        label: "Point d'activation",
        min: 0.1,
        max: 4.0,
        step: 0.1,
        value: 1.5,
        unit: 'mm',
      },
      {
        id: 'rapid-trigger',
        kind: 'toggle',
        label: 'Rapid Trigger',
        value: true,
        description: 'Réactivation instantanée à la moindre relâche de la touche',
      },
      { id: 'rgb', kind: 'color', label: 'Rétroéclairage', value: '#00ff88', effect: 'wave' },
      {
        id: 'polling',
        kind: 'enum',
        label: 'Taux de rafraîchissement',
        value: '1000',
        options: [
          { value: '125', label: '125 Hz' },
          { value: '1000', label: '1000 Hz' },
          { value: '8000', label: '8000 Hz (HyperPolling)' },
        ],
      },
    ],
  },
  {
    id: 'headset-arctis-nova-pro',
    name: 'Arctis Nova Pro Wireless',
    brand: 'SteelSeries',
    category: 'headset',
    connection: 'wireless',
    connected: true,
    batteryPercent: 58,
    firmwareVersion: '1.8.2',
    settings: [
      { id: 'sidetone', kind: 'range', label: 'Sidetone (retour micro)', min: 0, max: 100, step: 5, value: 30, unit: '%' },
      { id: 'mic-gain', kind: 'range', label: 'Gain micro', min: 0, max: 100, step: 5, value: 65, unit: '%' },
      {
        id: 'eq',
        kind: 'enum',
        label: 'Préréglage EQ',
        value: 'flat',
        options: [
          { value: 'flat', label: 'Flat' },
          { value: 'bass', label: 'Bass Boost' },
          { value: 'fps', label: 'FPS compétitif' },
          { value: 'immersive', label: 'Immersif' },
        ],
      },
      { id: 'noise-gate', kind: 'toggle', label: 'Porte de bruit micro', value: true },
    ],
  },
  {
    id: 'webcam-brio',
    name: 'Brio 505',
    brand: 'Logitech',
    category: 'webcam',
    connection: 'usb',
    connected: true,
    firmwareVersion: '2.1',
    settings: [
      { id: 'exposure', kind: 'range', label: 'Exposition', min: -4, max: 4, step: 1, value: 0 },
      {
        id: 'fov',
        kind: 'enum',
        label: 'Champ de vision',
        value: '78',
        options: [
          { value: '65', label: '65°' },
          { value: '78', label: '78°' },
          { value: '90', label: '90°' },
        ],
      },
      { id: 'hdr', kind: 'toggle', label: 'HDR', value: true },
      { id: 'auto-focus', kind: 'toggle', label: 'Mise au point automatique', value: true },
    ],
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockDriver: DeviceDriver = {
  name: 'mock',
  isSupported() {
    return true
  },
  async scan() {
    await delay(700 + Math.random() * 400)
    return clone(template)
  },
  async applySetting(deviceId, settingId, value) {
    await delay(250 + Math.random() * 200)
    const device = template.find((d) => d.id === deviceId)
    const setting = device?.settings.find((s) => s.id === settingId)
    if (setting) {
      setting.value = value
    }
  },
}
