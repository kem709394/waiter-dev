const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    statusBarHeight: 0,
    customBarHeight: 0,
    menuButton: {},
    privilege: [],
    subscribe: [],
    config: {},
    watcher: {
      book: null,
      inside: null,
      outside: null,
      invoke: null
    },
    timer: null,
    audio: null,
    current: null,
    book: {
      todo: 0,
      doing: 0
    },
    inside: {
      todo: 0,
      doing: 0
    },
    outside: {
      todo: 0,
      doing: 0
    },
    invoke: {
      list: [],
      loading: false
    }
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config,
      statusBarHeight: app.globalData.statusBarHeight,
      customBarHeight: app.globalData.customBarHeight,
      menuButton: app.globalData.menuButton,
      privilege: app.globalData.identity.staff.privilege,
      subscribe: app.globalData.identity.staff.subscribe ? app.globalData.identity.staff.subscribe : []
    })
    self.init()
    wx.setKeepScreenOn({
      keepScreenOn: true
    })
  },
  onUnload() {
    let self = this
    if (self.data.timer) {
      clearInterval(self.data.timer)
    }
    if (self.data.audio) {
      self.data.audio.destroy()
    }
    if (self.data.watcher.book) {
      self.data.watcher.book.close()
    }
    if (self.data.watcher.inside) {
      self.data.watcher.inside.close()
    }
    if (self.data.watcher.outside) {
      self.data.watcher.outside.close()
    }
    if (self.data.watcher.invoke) {
      self.data.watcher.invoke.close()
    }
    app.globalData.temp_flag.worktable_back = true
    wx.setKeepScreenOn({
      keepScreenOn: false
    })
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (self.data.watcher.book == null) {
        if (self.data.privilege.includes('service_order')){
          self.listenBookOrder()
        }
      }
      if (self.data.watcher.inside == null) {
        if (self.data.privilege.includes('service_order')){
          self.listenInsideOrder()
        }
      }
      if (self.data.watcher.outside == null) {
        if (self.data.privilege.includes('service_order')){
          self.listenOutsideOrder()
        }
      }
      if (self.data.watcher.invoke == null) {
        if (self.data.config.invoke.active && self.data.privilege.includes('service_invoke')) {
          self.listenInvoke()
        }
      }
    } else {
      self.data.back = true
    }
  },
  init() {
    let self = this
    if (self.data.privilege.includes('service_order')) {
      wx.showLoading({
        title: '正在加载',
        mask: true
      })
      setTimeout(() => {
        wx.hideLoading()
      }, 2000)
      self.listenBookOrder()
      self.listenInsideOrder()
      self.listenOutsideOrder()
    }
    if (self.data.config.invoke.active && self.data.privilege.includes('service_invoke')) {
      self.setData({
        'invoke.loading': true
      })
      self.data.timer = setInterval(() => {
        self.setData({
          current: new Date().getTime()
        })
      }, 1000)
      self.listenInvoke()
    }
    self.data.audio = wx.createInnerAudioContext()
    self.data.audio.src = '/voices/8906.wav'
  },
  listenBookOrder() {
    let self = this
    self.data.watcher.order = db.collection('book_order').where({
      is_deleted: false,
      state: _.and(_.gte(10), _.lt(20))
    }).orderBy('create_time', 'asc').watch({
      onChange: function(snapshot) {
        let list = []
        let count = 0
        snapshot.docs.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          list.unshift(item)
          if (item.state == 10) count++
        })
        if (count > 0) {
          self.data.audio.play()
        }
        self.setData({
          'book.todo': count,
          'book.doing': list.length,
        })
        app.globalData.rt_data.book_order = list
      },
      onError: function(err) {
        console.log('reconnect order')
        setTimeout(() => {
          self.listenBookOrder()
        }, 3000)
      }
    })
  },
  listenInsideOrder() {
    let self = this
    self.data.watcher.order = db.collection('inside_order').where({
      is_deleted: false,
      state: _.and(_.gte(10), _.lt(20))
    }).orderBy('create_time', 'asc').watch({
      onChange: function(snapshot) {
        let list = []
        let count = 0
        snapshot.docs.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          list.unshift(item)
          if (item.state == 10) count++
        })
        if (count > 0) {
          self.data.audio.play()
        }
        self.setData({
          'inside.todo': count,
          'inside.doing': list.length,
        })
        app.globalData.rt_data.inside_order = list
      },
      onError: function(err) {
        console.log('reconnect order')
        setTimeout(() => {
          self.listenInsideOrder()
        }, 3000)
      }
    })
  },
  listenOutsideOrder() {
    let self = this
    self.data.watcher.order = db.collection('outside_order').where({
      is_deleted: false,
      state: _.and(_.gte(10), _.lt(20))
    }).orderBy('create_time', 'asc').watch({
      onChange: function(snapshot) {
        let list = []
        let count = 0
        snapshot.docs.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          list.unshift(item)
          if (item.state == 10) count++
          if (item.delivery_state) item.delivery_time = moment(item.delivery_time).format('YYYY-MM-DD HH:mm')
        })
        if (count > 0) {
          self.data.audio.play()
        }
        self.setData({
          'outside.todo': count,
          'outside.doing': list.length,
        })
        app.globalData.rt_data.outside_order = list
      },
      onError: function(err) {
        console.log('reconnect order')
        setTimeout(() => {
          self.listenOutsideOrder()
        }, 3000)
      }
    })
  },
  listenInvoke() {
    let self = this
    self.data.watcher.invoke = db.collection('invoke').where({}).orderBy('create_time', 'asc').watch({
      onChange: function(snapshot) {
        let list = snapshot.docs
        if (list.length > self.data.invoke.list.length) {
          self.data.audio.play()
        }
        self.setData({
          'invoke.list': list.map(item => {
            item.time = item.create_time.getTime()
            return item
          }),
          'invoke.loading': false
        })
      },
      onError: function(err) {
        console.log('reconnect invoke')
        setTimeout(() => {
          self.listenInvoke()
        }, 3000)
      }
    })
  },
  activeChange(e) {
    let self = this
    let content = self.data.config.base
    content.active = e.detail.value
    wx.showLoading({
      title: '正在更新',
      mask: true
    })
    db.collection('config').doc('base').update({
      data: {
        content: content,
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res => {
      wx.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 2000
      })
      setInterval(() => {
        self.setData({
          config: app.globalData.config
        })
      }, 2000)
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  subscribe(e) {
    let self = this
    let type = e.currentTarget.dataset.type
    let subscribe = self.data.subscribe
    let index = subscribe.indexOf(type)
    if (index == -1) {
      subscribe.push(type)
    } else {
      subscribe.splice(index, 1)
    }
    wx.showLoading({
      title: '正在更新',
      mask: true
    })
    db.collection('staff').doc(app.globalData.identity.staff._id).update({
      data: {
        subscribe: subscribe
      }
    }).then(res => {
      self.setData({
        subscribe: subscribe
      })
      let identity = app.globalData.identity
      identity.staff.subscribe = subscribe
      wx.setStorage({
        key: 'identity',
        data: identity
      })
      wx.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 2000
      })
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  handleBook() {
    wx.navigateTo({
      url: '../book/list'
    })
  },
  handleInside() {
    wx.navigateTo({
      url: '../inside/list'
    })
  },
  handleOutside() {
    wx.navigateTo({
      url: '../outside/list'
    })
  },
  handleInvoke(e) {
    wx.showLoading({
      title: '正在操作',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'assist',
      data: {
        action: 'invoke_remove',
        id: e.currentTarget.dataset.id
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          icon: 'success',
          title: '操作成功！',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '操作失败',
          icon: 'none',
          duration: 2000
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
  back() {
    wx.navigateBack()
  },
  manage() {
    wx.redirectTo({
      url: '/subPackages/manage/pages/index/index'
    })
  }
})