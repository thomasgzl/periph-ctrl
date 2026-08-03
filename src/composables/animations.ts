import { onMounted, type Ref } from 'vue'
import gsap from 'gsap'

/** Staggered entrance for a list of cards inside a container, run once on mount. */
export function useStaggerReveal(container: Ref<HTMLElement | null | undefined>, selector = '.reveal-item') {
  onMounted(() => {
    if (!container.value) return
    const items = container.value.querySelectorAll(selector)
    gsap.from(items, {
      opacity: 0,
      y: 18,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.06,
    })
  })
}

/** GSAP-driven fade/slide used as <transition :css="false"> hooks for route changes. */
export function pageEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', onComplete: done },
  )
}

export function pageLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, y: -10, duration: 0.25, ease: 'power1.in', onComplete: done })
}

/** Quick pulse used to confirm a setting was written to the device's memory. */
export function pulseSaved(el: Element | null) {
  if (!el) return
  gsap.fromTo(
    el,
    { scale: 0.6, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(3)' },
  )
}
