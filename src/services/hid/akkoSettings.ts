import type { DeviceSetting } from './types'

/** Shared between the mock Akko keyboard and the real WebHID-connected one, so both show the same controls. */
export function createAkkoKeyboardSettings(): DeviceSetting[] {
  return [
    {
      id: 'actuation',
      kind: 'range',
      label: "Point d'activation",
      min: 0.1,
      max: 3.8,
      step: 0.1,
      value: 1.8,
      unit: 'mm',
    },
    {
      id: 'rapid-trigger',
      kind: 'toggle',
      label: 'Rapid Trigger',
      value: true,
      description: 'Réactivation instantanée à la moindre relâche de la touche',
    },
    { id: 'rgb', kind: 'color', label: 'Rétroéclairage', value: '#34e0d8', effect: 'wave' },
    {
      id: 'polling',
      kind: 'enum',
      label: 'Taux de rafraîchissement',
      value: '1000',
      options: [
        { value: '125', label: '125 Hz' },
        { value: '1000', label: '1000 Hz' },
        { value: '8000', label: '8000 Hz' },
      ],
    },
  ]
}
