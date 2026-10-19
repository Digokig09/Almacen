import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Almacen/', // ESTA LÍNEA ES LA MAGIA PARA GITHUB PAGES
})