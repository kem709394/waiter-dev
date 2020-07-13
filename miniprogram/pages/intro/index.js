const app = getApp()

Page({
  data: {
    album: [],
    content: ''
  },
  onLoad() {
    let self = this
    let config = app.globalData.config.base
    self.setData({
      album: config.album,
      content: config.intro
    })
  }
})