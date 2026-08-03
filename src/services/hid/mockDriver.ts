import { createAkkoKeyboardSettings } from './akkoSettings'
import type { DeviceDriver, PeripheralDevice } from './types'

function clone(devices: PeripheralDevice[]): PeripheralDevice[] {
  return devices.map((d) => ({ ...d, settings: d.settings.map((s) => ({ ...s })) }))
}

const template: PeripheralDevice[] = [
  {
    id: 'mouse-xlite-v3',
    name: 'Xlite V3 (Size 2)',
    brand: 'Pulsar',
    category: 'mouse',
    connection: 'wireless',
    connected: true,
    batteryPercent: 82,
    supportLevel: 'unsupported',
    supportNote:
      "Le protocole HID de la Xlite V3 n'est pas encore confirmé publiquement (pulsar-mouse-linux couvre X2A/X2H/Xlite v4, pas ce modèle) — capture USB nécessaire avant d'écrire dessus.",
    settings: [
      { id: 'dpi', kind: 'range', label: 'Sensibilité (DPI)', min: 100, max: 26000, step: 50, value: 1600 },
      {
        id: 'polling',
        kind: 'enum',
        label: 'Taux de rafraîchissement',
        value: '1000',
        options: [
          { value: '125', label: '125 Hz' },
          { value: '500', label: '500 Hz' },
          { value: '1000', label: '1000 Hz' },
          { value: '2000', label: '2000 Hz' },
        ],
      },
      {
        id: 'liftoff',
        kind: 'enum',
        label: 'Distance de décollage',
        value: 'low',
        options: [
          { value: 'low', label: 'Basse (~1mm)' },
          { value: 'mid', label: 'Moyenne (~2mm)' },
        ],
      },
    ],
  },
  {
    id: 'keyboard-tac75-he',
    name: 'TAC75 HE',
    brand: 'Akko',
    category: 'keyboard',
    connection: 'usb',
    connected: true,
    supportLevel: 'full',
    supportNote:
      "Contrôleur RongYuan RY5088, protocole documenté par le projet monsgeek-akko-linux (mêmes claviers HE Akko/MonsGeek).",
    settings: createAkkoKeyboardSettings(),
  },
  {
    id: 'headset-cloud-wireless',
    name: 'Cloud Wireless',
    brand: 'HyperX',
    category: 'headset',
    connection: 'wireless',
    connected: true,
    batteryPercent: 46,
    supportLevel: 'read-only',
    supportNote:
      "Seul le statut batterie est confirmé reverse-engineered pour ce modèle précis (par analogie avec Cloud Flight/Alpha/II Wireless) — sidetone, EQ et gain micro ne sont pas encore documentés publiquement.",
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
        ],
      },
    ],
  },
  {
    id: 'webcam-hd-1080p',
    name: 'HD 1080p',
    brand: 'Logitech',
    category: 'webcam',
    connection: 'usb',
    connected: true,
    supportLevel: 'full',
    supportNote:
      "Contrôlée via l'API standard du navigateur (MediaStreamTrack), pas du HID propriétaire — fonctionne pour n'importe quelle webcam UVC, pas seulement Logitech.",
    settings: [
      { id: 'exposure', kind: 'range', label: 'Exposition', min: -4, max: 4, step: 1, value: 0 },
      {
        id: 'white-balance',
        kind: 'enum',
        label: 'Balance des blancs',
        value: 'auto',
        options: [
          { value: 'auto', label: 'Automatique' },
          { value: '3000', label: 'Intérieur (3000K)' },
          { value: '5500', label: 'Jour (5500K)' },
        ],
      },
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
