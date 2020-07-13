const app = getApp()

Page({
  data: {
    detail: null
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config,
      detail: app.globalData.temp_data
    })
  }
})