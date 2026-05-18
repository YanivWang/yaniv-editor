<template>
  <LandingPage :theme="theme" @start-demo="openFullEditor" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import LandingPage from "../components/LandingPage.vue";

const router = useRouter();
const theme = ref<"light" | "dark">("light");

const openFullEditor = async () => {
  await router.push({ name: "full-editor" });
};
</script>
