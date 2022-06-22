import { createApp } from 'vue'
import App from './App.vue'
import './public-path.js'
import {
  renderWithQiankun,
  qiankunWindow
} from 'vite-plugin-qiankun/dist/helper'
let instance = null
function render(props = {}) {
  const { container } = props
  instance = createApp(App).mount(
    container ? container.querySelector('#app') : '#app'
  )
}
renderWithQiankun({
  mount(props) {
    console.log('mount')
    render(props)
  },
  bootstrap() {
    console.log('bootstrap')
  },
  unmount() {
    console.log('unmount')
    instance.$destroy()
    instance.$el.innerHTML = ''
    instance = null
  }
})
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({})
}
