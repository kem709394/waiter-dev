const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    date: {
      start: '',
      value: ''
    },
    table: [],
    book: {},
    record: {},
    checked: [],
    current: null,
    dialog: false
  },
  onLoad() {
    let self = this
    let date = moment().format('YYYY-MM-DD')
    self.setData({
      table: app.globalData.table,
      'date.start': date,
      'date.value': date
    })
    self.loadBook()
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (app.globalData.update) {
        self.setData({
          checked: []
        })
        self.loadBook()
        app.globalData.update = false
      }
    } else {
      self.data.back = true
    }
  },
  loadBook() {
    let self = this
    wx.showLoading({
      title: '正在查询',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'table_book',
        date_string: self.data.date.value
      }
    }).then(res => {
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
        wx.hideLoading()
      } else {
        wx.showToast({
          icon: 'none',
          title: '系统繁忙',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  dateChange(e) {
    let self = this
    self.setData({
      book: {},
      record: {},
      checked: [],
      'date.value': e.detail.value
    })
    self.loadBook()
  },
  chooseTable(e) {
    let self = this
    let id = e.currentTarget.dataset.id
    let checked = self.data.checked
    if (checked.includes(id)) {
      let index = checked.indexOf(id)
      checked.splice(index, 1)
    } else {
      checked.push(id)
    }
    self.setData({
      checked: checked
    })
  },
  showDialog(e) {
    let self = this
    let book = self.data.book[e.currentTarget.dataset.id]
    self.setData({
      dialog: true,
      current: book
    })
  },
  tapDialog() {
    this.setData({
      dialog: false
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  },
  inputBook() {
    let self = this
    let checked = self.data.checked
    if (checked.length > 0) {
      let table = []
      self.data.table.forEach(item=>{
        if (checked.includes(item._id)) {
          table.push({
            name: item.name,
            value: item._id,
            contain: item.contain
          })
        }
      })
      app.globalData.temp_data = {
        key: 'book_table',
        date: self.data.date.value,
        table: table
      }
      wx.navigateTo({
        url: 'input'
      })
    }
  }
})