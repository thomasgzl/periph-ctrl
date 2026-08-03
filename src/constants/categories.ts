import type { IconName } from '@/components/Icon.vue'
import type { DeviceCategory } from '@/services/hid'

export const CATEGORY_META: Record<DeviceCategory, { label: string; icon: IconName }> = {
  mouse: { label: 'Souris', icon: 'mouse' },
  keyboard: { label: 'Clavier', icon: 'keyboard' },
  headset: { label: 'Casque', icon: 'headset' },
  webcam: { label: 'Webcam', icon: 'webcam' },
}

export const CATEGORY_ORDER: DeviceCategory[] = ['mouse', 'keyboard', 'headset', 'webcam']
