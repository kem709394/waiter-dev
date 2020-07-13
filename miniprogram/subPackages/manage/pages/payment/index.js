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
    wechat: null,
    search: {
      temp: '',
      value: ''
    },
    temp_wechat: null
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
  },
  load() {
    let self = this
    if (!self.data.finish && !self.data.loading) {
      self.setData({
        loading: true,
        triggered: false
      })
      let query = {
        money: _.gt(0)
      }
      if (self.data.wechat) {
        query.openid = self.data.wechat.openid
      }
      db.collection('payment').where(query).orderBy('create_time', 'desc').skip(self.data.current).limit(self.data.size).get().then(res=>{
        let oids = []
        let list = self.data.list
        res.data.forEach(item => {
          oids.push(item.openid)
          item.start_time = moment(item.start_time).format('YYYY-MM-DD HH:mm')
          if (item.end_time) {
            item.end_time = moment(item.end_time).format('YYYY-MM-DD HH:mm')
          }
          list.push(item)
        })
        self.setData({
          loading: false,
          finish: res.data.length < self.data.size,
          current: res.data.length + self.data.current,
          list: list
        })
        app.tempWechatReadyCallback = () => {
          self.setData({
            temp_wechat: app.globalData.temp_wechat
          })
        }
        app.syncTempWechat(oids)
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
    db.collection('user').where({
      openid: '{openid}',
      name: value
    }).get().then(res=>{
      if (res.data.length) {
        self.setData({
          user: res.data[0],
          current: 0,
          finish: false,
          loading: false,
          list: [],
          'search.value': value
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
    })
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