import type { DeviceSetting } from './types'

/** Shared between the mock Pulsar mouse and the real WebHID-connected one, so both show the same controls. */
export function createPulsarMouseSettings(): DeviceSetting[] {
  return [
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
  ]
}
