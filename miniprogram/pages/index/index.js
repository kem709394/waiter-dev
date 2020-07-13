const app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    statusBarHeight: 0,
    config: {},
    granted: false,
    coordinate: null,
    notice: {
      dialog: false,
      title: '',
      content: '',
      buttons: [{
        text: '更多'
      }, {
        text: '确认'
      }]
    },
    password: {
      action: '',
      dialog: false,
      value: ''
    }
  },
  onShareAppMessage() {
    let base = this.data.config.base
    return {
      title: base.name,
      path: '/pages/index/index',
      imageUrl: base.avatar
    }
  },
  onLoad(options) {
    let self = this
    self.setData({
      statusBarHeight: app.globalData.statusBarHeight
    })
    if (app.globalData.config) {
      self.setData({
        config: app.globalData.config
      })
    } else {
      app.configReadyCallback = () => {
        self.setData({
          config: app.globalData.config
        })
      }
    }
    if (app.globalData.identity) {
      self.setData({
        granted: true
      })
    } else {
      app.identityReadyCallback = () => {
        self.setData({
          granted: true
        })
      }
    }
    self.getNotice()
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (app.globalData.identity && !self.data.granted) {
        self.setData({
          granted: true
        })
      }
      if (app.globalData.temp_flag.worktable_back) {
        let config = self.data.config
        if (config.base.notify.active && app.globalData.identity.staff.subscribe) {
          let tmplIds = []
          if (app.globalData.identity.staff.subscribe.includes('order')) {
            tmplIds.push(config.base.notify.template.order)
          }
          if (app.globalData.identity.staff.subscribe.includes('invoke')) {
            tmplIds.push(config.base.notify.template.invoke)
          }
          if (tmplIds.length > 0) {
            wx.showModal({
              title: '系统提示',
              content: '是否订阅提醒通知？',
              success(res) {
                if (res.confirm) {
                  wx.requestSubscribeMessage({
                    tmplIds: tmplIds,
                    success(res) {}
                  })
                }
              }
            })
          }
          app.globalData.temp_flag.worktable_back = false
        }
      }
    } else {
      self.data.back = true
    }
    app.location().then(res=>{
      self.setData({
        coordinate: res
      })
    })
  },
  login(value) {
    let self = this
    app.identityReadyCallback = () => {
      self.setData({
        granted: true
      })
      if (app.globalData.identity.staff) {
        self.setData({
          'password.action': value,
          'password.value': self.data.config.password.system,
          'password.dialog': true
        })
      }
    }
    app.authorize()
  },
  loginBack() {
    app.globalData.identity.credit = true
    if (this.data.password.action == 'worktable') {
      wx.navigateTo({
        url: '/subPackages/worktable/pages/index/index'
      })
    } else {
      wx.navigateTo({
        url: '/subPackages/manage/pages/index/index'
      })
    }
  },
  touchstartAvatar() {
    this.data.time = new Date().getTime()
  },
  touchendAvatar() {
    let self = this
    if (app.globalData.identity) {
      if (app.globalData.identity.staff) {
        if (new Date().getTime() - self.data.time > 1000) {
          if (app.globalData.identity.credit) {
            wx.navigateTo({
              url: '/subPackages/manage/pages/index/index'
            })
          } else {
            self.setData({
              'password.action': 'manage',
              'password.value': self.data.config.password.system,
              'password.dialog': true
            })
          }
        } else {
          if (app.globalData.identity.credit) {
            wx.navigateTo({
              url: '/subPackages/worktable/pages/index/index'
            })
          } else {
            self.setData({
              'password.action': 'worktable',
              'password.value': self.data.config.password.system,
              'password.dialog': true
            })
          }
        }
      }
    } else {
      if (new Date().getTime() - self.data.time > 1000) {
        self.login('manage')
      } else {
        self.login('worktable')
      }
    }
  },
  getNotice() {
    let self = this
    db.collection('notice').where({
      is_deleted: false,
      visible: true
    }).orderBy('create_time', 'desc').limit(1).get().then(res=>{
      if (res.data.length) {
        self.setData({
          'notice.title': res.data[0].title,
          'notice.content': res.data[0].content
        })
      }
    })
  },
  showNotice() {
    this.setData({
      'notice.dialog': true
    })
  },
  tapNotice(e) {
    let self = this
    if (e.detail.index == 0) {
      wx.navigateTo({
        url: '../notice/index'
      })
    }
    self.setData({
      'notice.dialog': false
    })
  },
  openMap() {
    let self = this
    wx.openLocation({
      latitude: self.data.config.base.location.coordinate.coordinates[1],
      longitude: self.data.config.base.location.coordinate.coordinates[0],
      scale: 15,
      name: self.data.config.base.location.name,
      address: self.data.config.base.address
    })
  },
  callPhone() {
    wx.makePhoneCall({
      phoneNumber: this.data.config.base.telephone
    })
  }
})