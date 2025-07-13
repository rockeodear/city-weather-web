import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/city-weather-web/',
  plugins: [vue()],
})
