const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    title: '',
    privilege: []
  },
  onLoad(options) {
    let self = this
    self.setData({
      title: options.title,
      privilege: app.globalData.identity.staff.privilege
    })
    db.collection('printer').orderBy('priority', 'desc').get().then(res => {
      app.globalData.rt_data.printer = res.data
    })
  },
  openPage(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  }
})