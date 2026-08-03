<script setup lang="ts">
import { pageEnter, pageLeave } from '@/composables/animations'
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar />

    <main class="flex-1 px-6 py-8 md:px-10 md:py-10">
      <div class="mx-auto max-w-5xl">
        <RouterView v-slot="{ Component }">
          <Transition :css="false" mode="out-in" @enter="pageEnter" @leave="pageLeave">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>
