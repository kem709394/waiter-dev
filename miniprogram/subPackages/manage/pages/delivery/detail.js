const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    staff: null,
    order: null
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    let staff = app.globalData.temp_staff
    self.setData({
      detail: detail,
      staff: staff
    })
    db.collection('outside_order').doc(detail.order_id).get().then(res => {
      self.setData({
        order: res.data
      })
    })
  },
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) {}
    })
  }
})