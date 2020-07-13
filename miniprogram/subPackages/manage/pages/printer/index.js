const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

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
    buttons: []
  },
  onLoad(options) {
    let self = this
    let buttons = []
    let privilege = app.globalData.identity.staff.privilege
    if (privilege.includes('printer-update')) buttons.push({
      text: '编辑'
    })
    if (privilege.includes('printer-remove')) buttons.push({
      text: '删除',
      type: 'warn'
    })
    self.setData({
      title: options.title,
      buttons: buttons,
      privilege: privilege
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
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('printer').count().then(res => {
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
      db.collection('printer').skip(self.data.current).limit(self.data.size).orderBy('priority', 'asc').get().then(res => {
        let list = self.data.list
        res.data.forEach(item => {
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
  tapSlide(e) {
    let self = this
    if (e.detail.index) {
      self.remove(e.currentTarget.dataset.index)
    } else {
      let item = self.data.list[e.currentTarget.dataset.index]
      app.globalData.temp_data = tools.objCopy(item)
      wx.navigateTo({
        url: 'update'
      })
    }
  },
  detail(e) {
    app.globalData.temp_data = tools.objCopy(this.data.list[e.currentTarget.dataset.index])
    wx.navigateTo({
      url: 'detail'
    })
  },
  create() {
    wx.navigateTo({
      url: 'create'
    })
  },
  remove(index) {
    let self = this
    let item = self.data.list[index]
    wx.showModal({
      title: '操作提示',
      content: '确定要删除当前打印机？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          db.collection('printer').doc(item._id).remove().then(res=>{
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
  }
})