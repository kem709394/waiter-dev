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
    let tmplIds = [config.outside.notify.template.success, config.outside.notify.template.cancel, config.outside.notify.template.finish]
    if (self.data.order.mode == 'delivery' && config.outside.delivery.notify.active) {
      tmplIds[0] = config.outside.delivery.notify.template.sendout
    }
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success(res) {
        self.showDetail()
      }
    })
  },
  showDetail() {
    wx.redirectTo({
      url: 'detail?id=' + this.data.order.order_id
    })
  },
  goBack() {
    wx.navigateBack()
  }
})