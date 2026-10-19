import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Asegúrate de que el nombre coincida EXACTAMENTE con tu repositorio, incluyendo mayúsculas y minúsculas.
  base: '/Almacen/', 
})