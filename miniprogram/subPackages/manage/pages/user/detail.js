const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    address: []
  },
  onLoad() {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail
    })
    self.getAddress(detail._id)
  },
  getAddress(id) {
    let self = this
    db.collection('address').where({
      owner_uid: id
    }).get().then(res=>{
      self.setData({
        address: res.data
      })
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  },
  openMap(e) {
    let address = this.data.address[e.currentTarget.dataset.index]
    wx.openLocation({
      latitude: address.location.coordinate.latitude,
      longitude: address.location.coordinate.longitude,
      scale: 15,
      name: address.location.name,
      address: address.content
    })
  }
})