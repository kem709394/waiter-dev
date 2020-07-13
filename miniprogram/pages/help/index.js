const app = getApp()

Page({
  data: {
    config: {},
    curItem: ''
  },
  onLoad() {
    this.setData({
      config: app.globalData.config
    })
  },
  toggleItem(e) {
    let self  = this
    let key = e.currentTarget.dataset.key
    if (self.data.curItem == key) {
      self.setData({
        curItem: ''
      })
    } else {
      self.setData({
        curItem: key
      })
    }
  }
})