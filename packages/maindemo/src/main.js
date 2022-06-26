import { createApp } from 'vue'
import App from './App.vue'
import { registerMicroApps, start } from 'qiankun'
registerMicroApps([
  {
    name: 'vueApp1',
    entry: '//localhost:3001',
    container: '#app',
    activeRule: '/micro1'
  },
  {
    name: 'vueApp2',
    entry: '//localhost:3002',
    container: '#app',
    activeRule: '/micro2'
  }
])

createApp(App).mount('#app')
start()
