const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate
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
    },
    temp_wechat: {}
  },
  onLoad(options) {
    let self = this
    self.setData({
      privilege: app.globalData.identity.staff.privilege,
      title: options.title
    })
    self.init()
  },
  init() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('feedback').where({
        is_deleted: false
      }).count().then(res => {
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
      let aggregate = db.collection('feedback').aggregate().match({
        is_deleted: false
      })
      if (self.data.search.value != '') {
        aggregate = aggregate.addFields({
            searchIndex: $.indexOfBytes(['$note', self.data.search.value])
          })
          .match({
            searchIndex: _.gte(0)
          })
      }
      aggregate.sort({
        create_time: -1
      }).skip(self.data.current).limit(self.data.size).end().then(res => {
        let openids = []
        let list = self.data.list
        res.list.forEach(item => {
          item.date = moment(item.create_time).format('YYYY年M月D日')
          list.push(item)
          openids.push(item._openid)
        })
        self.setData({
          loading: false,
          finish: res.list.length < self.data.size,
          current: res.list.length + self.data.current,
          list: list
        })
        app.tempWechatReadyCallback = () => {
          self.setData({
            temp_wechat: app.globalData.temp_wechat
          })
        }
        app.syncTempWechat(openids)
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
      wx.hideLoading()
      self.setData({
        current: 0,
        finish: false,
        loading: false,
        list: [],
        'search.value': value
      })
      self.load()
    }, 1000)
  },
  remove(e) {
    let self = this
    let item = self.data.list[e.currentTarget.dataset.index]
    wx.showModal({
      title: '操作提示',
      content: '确定要删除当前反馈？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          db.collection('feedback').doc(item._id).remove().then(res=>{
            wx.showToast({
              title: '删除成功！',
              icon: 'success',
              duration: 2000
            })
            setTimeout(() => {
              self.init()
            }, 2000)
          }).catch(err=>{
            wx.showToast({
              title: '系统繁忙',
              icon: 'none',
              duration: 2000
            })
          })
        }
      }
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  }
})