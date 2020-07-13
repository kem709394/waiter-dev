const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate
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
    hide: 0,
    show: 0,
    search: {
      temp: '',
      value: ''
    },
    buttons: []
  },
  onLoad(options) {
    let self = this
    let buttons = []
    let privilege = app.globalData.identity.staff.privilege
    if (privilege.includes('notice-update')) buttons.push({
      text: '编辑'
    })
    if (privilege.includes('notice-remove')) buttons.push({
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
    db.collection('notice').aggregate().match({
      is_deleted: false
    }).group({
      _id: '$visible',
      count: $.sum(1)
    }).end().then(res => {
      let show = 0
      let hide = 0
      res.list.forEach(item => {
        if (item._id) {
          show = item.count
        } else {
          hide = item.count
        }
      })
      wx.hideLoading()
      self.setData({
        current: 0,
        finish: false,
        loading: false,
        list: [],
        total: show + hide,
        show: show,
        hide: hide
      })
      if (show + hide > 0) {
        self.load()
      }
    }).catch(err => {
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
      let aggregate = db.collection('notice').aggregate().match({
        is_deleted: false
      })
      if (self.data.search.value != '') {
        aggregate = aggregate.addFields({
            searchIndex: $.indexOfBytes(['$name', self.data.search.value])
          })
          .match({
            searchIndex: _.gte(0)
          })
      }
      aggregate.sort({
        priority: 1,
        create_time: 1
      }).skip(self.data.current).limit(self.data.size).end().then(res => {
        let list = self.data.list
        res.list.forEach(item => {
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
      content: '确定要删除当前公告？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          db.collection('notice').doc(item._id).update({
            data: {
              is_deleted: true,
              update_sid: app.globalData.identity.staff._id,
              update_time: db.serverDate(),
            }
          }).then(res=>{
            wx.showToast({
              title: '删除成功',
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