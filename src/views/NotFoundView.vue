<script setup lang="ts"></script>

<template>
  <div class="flex flex-col items-center gap-4 py-24 text-center">
    <h1 class="text-2xl font-semibold">Page introuvable</h1>
    <p class="text-sm text-text-dim">Ce périphérique n'existe pas (encore).</p>
    <RouterLink to="/" class="accent-ring glass-panel px-4 py-2 text-sm text-text-h hover:border-accent/40">
      Retour au dashboard
    </RouterLink>
  </div>
</template>
