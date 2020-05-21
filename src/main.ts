import Vue from 'vue';
import App from './App.vue';
import './registerServiceWorker';
import '@mdi/font/css/materialdesignicons.css';
import router from './router';
import vuetify from './plugins/vuetify';

document.oncontextmenu = () => false;

// noinspection JSUnusedGlobalSymbols
new Vue({
  router,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');
