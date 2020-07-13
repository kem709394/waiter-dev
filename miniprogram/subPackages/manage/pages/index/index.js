const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate

Page({
  data: {
    staff: {},
    count: {
      staff: 0,
      table: 0,
      menu: 0,
      inside_order: 0,
      outside_order: 0,
      book_order: 0
    }
  },
  onLoad() {
    let self = this
    self.setData({
      staff: app.globalData.identity.staff
    })
    self.init()
  },
  init() {
    let self = this
    db.collection('staff').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.staff': res.total
      })
    })
    db.collection('table').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.table': res.total
      })
    })
    db.collection('menu').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.menu': res.total
      })
    })
    db.collection('book_order').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.book_order': res.total
      })
    })
    db.collection('inside_order').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.inside_order': res.total
      })
    })
    db.collection('outside_order').where({
      is_deleted: false
    }).count().then(res=>{
      self.setData({
        'count.outside_order': res.total
      })
    })
  }
})