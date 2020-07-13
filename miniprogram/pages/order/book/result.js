const app = getApp()

Page({
  data: {
    config: {},
    order: {}
  },
  onLoad(options) {
    this.setData({
      config: app.globalData.config,
      order: options
    })
  },
  subscribe() {
    let self = this
    let config = self.data.config
    wx.requestSubscribeMessage({
      tmplIds: [config.book.notify.template.success, config.book.notify.template.refund, config.book.notify.template.cancel],
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