const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    column: [],
    kitchen: [{
      name: '未指定厨房',
      value: ''
    }]
  },
  onLoad() {
    let self = this
    let column = app.globalData.rt_data.column.map(item => {
      return {
        name: item.name,
        value: item._id,
        scope: item.scope
      }
    })
    let kitchen = self.data.kitchen
    app.globalData.rt_data.kitchen.forEach(item => {
      kitchen.push({
        name: item.name,
        value: item._id
      })
    })
    self.setData({
      detail: app.globalData.temp_data,
      column: column,
      kitchen: kitchen
    })
  }
})