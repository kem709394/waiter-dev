const app = getApp()

Page({
  data: {
    config: {},
    order: {}
  },
  onLoad: function (options) {
    this.setData({
      config: app.globalData.config,
      order: options
    })
  },
  subscribe() {
    let self = this
    let config = self.data.config
    wx.requestSubscribeMessage({
      tmplIds: [config.inside.notify.template.success, config.inside.notify.template.cancel, config.inside.notify.template.finish],
      success(res) {
        self.showDetail()
      }
    })
  },
  showDetail() {
    wx.redirectTo({
      url: 'detail?id=' + this.data.order.order_id
    })
  }
})