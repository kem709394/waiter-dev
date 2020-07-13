const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    stateOptions: ['离职', '在职'],
    userInfo: null
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail
    })
    if (detail.openid != '') {
      db.collection('user').where({
        _openid: detail.openid
      }).get().then(res => {
        if (res.data.length > 0) {
          self.setData({
            userInfo: res.data[0]
          })
        }
      })
    }
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  }
})