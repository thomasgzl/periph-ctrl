<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { CATEGORY_META, CATEGORY_ORDER } from '@/constants/categories'
</script>

<template>
  <aside class="flex w-20 shrink-0 flex-col items-center gap-2 border-r border-white/10 py-6 md:w-56 md:items-stretch md:px-4">
    <RouterLink
      to="/"
      class="mb-6 flex items-center gap-2 px-2 font-display text-lg font-semibold text-text-h md:px-2"
    >
      <span
        class="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-black"
      >P</span>
      <span class="hidden md:inline">Periph Ctrl</span>
    </RouterLink>

    <nav class="flex flex-1 flex-col gap-1">
      <RouterLink
        to="/"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-dim transition-colors hover:bg-white/5 hover:text-text-h"
        active-class="!bg-white/[0.07] !text-text-h"
      >
        <Icon name="grid" class="text-lg" />
        <span class="hidden md:inline">Dashboard</span>
      </RouterLink>

      <RouterLink
        v-for="category in CATEGORY_ORDER"
        :key="category"
        :to="`/${category}`"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-dim transition-colors hover:bg-white/5 hover:text-text-h"
        active-class="!bg-white/[0.07] !text-text-h"
      >
        <Icon :name="CATEGORY_META[category].icon" class="text-lg" />
        <span class="hidden md:inline">{{ CATEGORY_META[category].label }}</span>
      </RouterLink>
    </nav>

    <p class="hidden px-3 text-xs text-text-dim md:block">
      Tout en local, aucun logiciel constructeur.
    </p>
  </aside>
</template>
