const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    column: [],
    menu: {}
  },
  onLoad() {
    let self = this
    self.setData({
      detail: app.globalData.temp_data,
      column: app.globalData.rt_data.column.map(item => {
        return {
          name: item.name,
          value: item._id,
          scope: item.scope
        }
      })
    })
    self.loadMenu()
  },
  loadMenu() {
    let self = this
    db.collection('menu')
      .aggregate()
      .match({
        is_deleted: false,
        type: 'single'
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res => {
        let menu = {}
        res.list.forEach(item => {
          menu[item._id] = item
        })
        self.setData({
          menu: menu
        })
      })
  }
})