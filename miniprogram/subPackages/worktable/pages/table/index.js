const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    table: [],
    state: {},
    book: {},
    record: {}
  },
  onLoad() {
    let self = this
    self.setData({
      table: app.globalData.table
    })
    wx.showLoading({
      title: '正在查询',
      mask: true
    })
    self.loadBook()
    self.loadState()
  },
  loadBook() {
    let self = this
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'table_book',
        date_string: moment().format('YYYY-MM-DD')
      }
    }).then(res => {
      if (self.data.back) {
        wx.hideLoading()
      } else {
        self.data.back = true
      }
      if (res.result && res.result.errcode == 0) {
        let book = {}
        let record = {}
        res.result.list.forEach(item1 => {
          book[item1._id] = item1
          item1.table_ids.forEach(item2 => {
            if (record[item2]) {
              record[item2].push({
                order: item1._id,
                time: item1.time_range
              })
            } else {
              record[item2] = [{
                order: item1._id,
                time: item1.time_range
              }]
            }
          })
        })
        self.setData({
          book: book,
          record: record
        })
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  loadState() {
    let self = this
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'table_state'
      }
    }).then(res => {
      if (self.data.back) {
        wx.hideLoading()
      } else {
        self.data.back = true
      }
      if (res.result && res.result.errcode == 0) {
        let state = {}
        res.result.list.forEach(item => {
          state[item.table] = item
        })
        self.setData({
          state: state
        })
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  showBook(e) {
    let record = this.data.record[e.currentTarget.dataset.id]
    let content = ''
    record.forEach(item => {
      content += '\r\n' + item.time[0] + ' 至 ' + item.time[1]
    })
    wx.showModal({
      title: '预订时间',
      showCancel: false,
      content: content,
      success(res) { }
    })
  }
})