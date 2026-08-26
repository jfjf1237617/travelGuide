import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 使用相对路径，保证部署到 GitHub Pages 子路径（用户名.github.io/仓库名/）时资源能正常加载
  base: './',
})
