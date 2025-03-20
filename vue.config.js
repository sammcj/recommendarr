const { defineConfig } = require('@vue/cli-service')
const package = require('./package.json')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.BASE_URL || '/',
  chainWebpack: config => {
    config.plugin('define').tap(args => {
      args[0]['process.env'].VUE_APP_VERSION = JSON.stringify(package.version)
      return args
    })
  },
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
