const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    title: '',
    privilege: [],
    current: 0,
    finish: false,
    loading: false,
    size: 20,
    list: [],
    total: 0,
    search: {
      temp: '',
      value: ''
    }
  },
  onLoad(options) {
    let self = this
    self.setData({
      title: options.title,
      privilege: app.globalData.identity.staff.privilege
    })
    self.init()
  },
  init() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('user').count().then(res => {
        wx.hideLoading()
        self.setData({
          current: 0,
          finish: false,
          loading: false,
          list: [],
          total: res.total
        })
        if (res.total > 0) {
          self.load()
        }
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
  },
  load() {
    let self = this
    if (!self.data.finish && !self.data.loading) {
      self.setData({
        loading: true
      })
      let aggregate = db.collection('user').aggregate()
      if (self.data.search.value != '') {
        aggregate = aggregate.addFields({
          searchIndex: $.indexOfBytes(['$nick_name', self.data.search.value])
        })
          .match({
            searchIndex: _.gte(0)
          })
      }
      aggregate.sort({
        create_time: -1
      }).skip(self.data.current).limit(self.data.size).end().then(res => {
        let list = self.data.list
        res.list.forEach(item => {
          item.date = moment(item.create_time).format('YYYY年M月D日')
          list.push(item)
        })
        self.setData({
          loading: false,
          finish: res.list.length < self.data.size,
          current: res.list.length + self.data.current,
          list: list
        })
      })
    }
  },
  search() {
    let self = this
    let value = self.data.search.temp.trim()
    wx.showLoading({
      title: '正在搜索',
      mask: true
    })
    setTimeout(() => {
      self.setData({
        current: 0,
        finish: false,
        loading: false,
        list: [],
        'search.value': value
      })
      self.load()
      wx.hideLoading()
    }, 1000)
  },
  detail(e) {
    app.globalData.temp_data = tools.objCopy(this.data.list[e.currentTarget.dataset.index])
    wx.navigateTo({
      url: 'detail'
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  }
})