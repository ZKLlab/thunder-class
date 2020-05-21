<template>
  <router-view />
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component
export default class App extends Vue {
}
</script>

<style lang="scss">
  html {
    user-select: none;
    background: #171717;
  }
</style>
