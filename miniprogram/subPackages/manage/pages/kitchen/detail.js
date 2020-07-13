const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    printerOptions: []
  },
  onLoad() {
    let self = this
    self.setData({
      detail: app.globalData.temp_data,
      printerOptions: app.globalData.rt_data.printer.map(item=>{
        return {
          value: item._id,
          name: item.name
        }
      })
    })
  }
})