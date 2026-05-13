<template>
    <div class="layout">
      <NavigationPanel/>
      <router-view />
    </div>
  </template>
  
  <script>
  import NavigationPanel from './NavigationPanel.vue'
  
  export default {
    components: {
        NavigationPanel,
     },
  }
  </script>
  
  <style scoped>
  .layout {
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: none;
    padding: 50px 50px 0;
    gap: 50px;
    box-sizing: border-box;
  }
  </style>
  