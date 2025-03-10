const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.BASE_URL || '/',
  devServer: {
    port: process.env.PORT || 8080,
    proxy: {
      '/api': {
        target: process.env.DEV_API_URL || 'http://localhost:3050',
        changeOrigin: true
      }
    }
  }
})
