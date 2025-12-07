import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'jsuites/dist/jsuites.css'
import 'jspreadsheet-ce/dist/jspreadsheet.css'

createApp(App).use(router).mount('#app')

