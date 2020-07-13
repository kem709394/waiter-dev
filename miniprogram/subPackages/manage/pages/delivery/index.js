const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    title: '',
    finish: false,
    loading: false,
    size: 20,
    list: [],
    search: {
      temp: '',
      value: ''
    },
    staff: {
      current: null,
      data: {}
    }
  },
  onLoad(options) {
    let self = this
    self.setData({
      title: options.title,
    })
    self.init()
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (app.globalData.update) {
        self.init()
        app.globalData.update = false
      }
    } else {
      self.data.back = true
    }
  },
  init() {
    let self = this
    self.setData({
      current: 0,
      finish: false,
      loading: false,
      list: []
    })
    self.load()
    db.collection('staff').where({
      is_deleted: false
    }).get().then(res=>{
      let data = {}
      res.data.forEach(item=>{
        data[item._id] = item
      })
      self.setData({
        'staff.data': data
      })
    })
  },
  load() {
    let self = this
    if (!self.data.finish && !self.data.loading) {
      self.setData({
        loading: true,
        triggered: false
      })
      let query = {
        state: _.gt(0)
      }
      if (self.data.staff.current) {
        query.delivery_sid = self.data.staff.current
      }
      db.collection('delivery').where(query).orderBy('delivery_time', 'desc').skip(self.data.current).limit(self.data.size).get().then(res=>{
        let list = self.data.list
        res.data.forEach(item => {
          item.delivery_time = moment(item.delivery_time).format('YYYY-MM-DD HH:mm')
          if (item.cancel_time) {
            item.cancel_time = moment(item.cancel_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.finish_time) {
            item.finish_time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
          }
          list.push(item)
        })
        self.setData({
          loading: false,
          finish: res.data.length < self.data.size,
          current: res.data.length + self.data.current,
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
    for(let id in self.data.staff.data) {
      console.log(id)
      let staff = self.data.staff.data[id]
      if (staff.full_name == value) {
        self.setData({
          current: 0,
          finish: false,
          loading: false,
          list: [],
          'search.value': value,
          'staff.current': id
        })
        self.load()
        wx.hideLoading()
      } else {
        wx.showToast({
          title: '找不到相关记录',
          icon: 'none',
          duration: 2000
        })
      }
    }
  },
  detail(e) {
    app.globalData.temp_data = tools.objCopy(this.data.list[e.currentTarget.dataset.index])
    app.globalData.temp_staff = tools.objCopy(this.data.staff.data)
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