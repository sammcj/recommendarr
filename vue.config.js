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
  },
  pwa: {
    name: 'Recommendarr',
    themeColor: '#4DBA87',
    msTileColor: '#000000',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      skipWaiting: true
    },
    manifestOptions: {
      display: 'standalone',
      background_color: '#000000'
    }
  }
})
