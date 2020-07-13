App({
  globalData: {
    rt_data: {},
    temp_user: {},
    temp_staff: {},
    temp_wechat: {},
    temp_data: {},
    temp_flag: {},
    coordinate: null
  },
  onLaunch() {
    let self = this
    if (wx.cloud) {
      wx.cloud.init({
        env: 'dev-3r8qc',
        // env: 'pro-043xs',
        traceUser: true
      })
    }
    wx.getSystemInfo({
      success: e => {
        const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null
        self.globalData.windowWidth = e.windowWidth
        self.globalData.windowHeight = e.windowHeight
        self.globalData.statusBarHeight = e.statusBarHeight
        self.globalData.menuButton = menuButton
        self.globalData.customBarHeight = menuButton.bottom + menuButton.top - e.statusBarHeight
      }
    })
  //  wx.clearStorage()
    self.update()
    self.login()
    self.listenConfig()
  },
  update() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate(function(res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function() {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function(res) {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
          updateManager.onUpdateFailed(function() {
            wx.showModal({
              title: '已经有新版本了哟~',
              content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~'
            })
          })
        }
      })
    }
  },
  login() {
    let self = this
    try {
      wx.getSetting({
        success(res) {
          if (res.authSetting['scope.userInfo']) {
            wx.getUserInfo({
              lang: 'zh_CN',
              success: function (res) {
                self.globalData.userInfo = res.userInfo
                try {
                  self.userInfoReadyCallback()
                } catch (e) { }
                wx.cloud.callFunction({
                  name: 'system',
                  data: {
                    action: 'login',
                    data: res.userInfo
                  }
                }).then(res => {
                  if (res.result && res.result.errcode == 0) {
                    self.globalData.identity = res.result.identity
                    try {
                      self.identityReadyCallback()
                    } catch (e) {}
                  } else {
                    try {
                      self.identityFailCallback()
                    } catch (e) {}
                  }
                })
              }
            })
          }
        }
      })
    } catch (e) {
      console.log(e)
    }
  },
  listenConfig() {
    let self = this
    wx.cloud.database().collection('config').where({}).watch({
      onChange: function(snapshot) {
        console.log('connect config')
        self.loadTable()
        self.loadColumn()
        self.globalData.config = {}
        snapshot.docs.forEach(item => {
          self.globalData.config[item._id] = item.content
        })
        try {
          self.configReadyCallback()
        } catch (e) {}
      },
      onError: function(err) {
        console.log('reconnect config')
        setTimeout(() => {
          self.listenConfig()
        }, 3000)
      }
    })
  },
  refreshConfig() {
    db.collection('config').doc('base').update({
      data: {
        update_sid: self.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    })
  },
  loadTable() {
    let self = this
    wx.cloud.database().collection('table')
      .aggregate()
      .match({
        is_deleted: false,
        state: 1
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res=>{
        if (self.globalData.table) {
          self.globalData.table = res.list
        } else {
          self.globalData.table = res.list
          try {
            self.tableReadyCallback()
          } catch (e) { }
        }
      })
  },
  loadColumn() {
    let self = this
    wx.cloud.database().collection('column')
      .aggregate()
      .match({
        is_deleted: false
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res => {
        if (self.globalData.column) {
          self.globalData.column = res.list
        } else {
          self.globalData.column = res.list
          try {
            self.columnReadyCallback()
          } catch (e) { }
        }
      })
  },
  location() {
    let self = this
    return new Promise((resolve, reject) => { 
      wx.getLocation({
        type: 'gcj02',
        success(res) {
          self.globalData.coordinate = res
          resolve(res)
        },
        fail(err) {
          wx.showToast({
            title: '获取位置信息失败',
            icon: 'none',
            duration: 2000
          })
        }
      })
    })
  },
  location2() {
    let self = this
    return new Promise((resolve, reject) => { 
      wx.showModal({
        title: '位置信息权限',
        content: '需要获取您的位置信息才能进行下一步操作',
        success (res) {
          if (res.confirm) {
            wx.openSetting({
              success(res) {
                if (res.authSetting['scope.userLocation']) {
                  self.location().then(res=>{
                    resolve(res)
                  })
                } else {
                  wx.showToast({
                    title: '位置信息授权失败',
                    icon: 'none',
                    duration: 2000
                  })
                }
              },
              fail(err) {
                wx.showToast({
                  title: '获取授权失败',
                  icon: 'none',
                  duration: 2000
                })
              }
            })
          }
        }
      })
    })
  },
  authorize() {
    let self = this
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            lang: 'zh_CN',
            success: function (res) {
              self.globalData.userInfo = res.userInfo
              try {
                self.userInfoReadyCallback()
              } catch (e) { }
              wx.showLoading({
                title: '正在登录',
                mask: true
              })
              wx.cloud.callFunction({
                name: 'system',
                data: {
                  action: 'login',
                  data: res.userInfo
                }
              }).then(res => {
                wx.hideLoading()
                if (res.result && res.result.errcode == 0) {
                  self.globalData.identity = res.result.identity
                  try {
                    self.identityReadyCallback()
                  } catch (e) { 
                    wx.showToast({
                      title: '登录成功',
                      icon: 'success',
                      duration: 2000
                    })
                  }
                } else {
                  try {
                    self.identityFailCallback()
                  } catch (e) {
                    wx.showToast({
                      title: '登录失败',
                      icon: 'none',
                      duration: 2000
                    })
                  }
                }
              }).catch(err => {
                wx.showToast({
                  title: '系统繁忙',
                  icon: 'none',
                  duration: 2000
                })
              })
            }
          })
        } else {
          wx.navigateTo({
            url: '/pages/authorize/index',
          })
        }
      }
    })
  },
  setUserData(data) {
    let self = this
    const db = wx.cloud.database()
    data.update_time = db.serverDate()
    db.collection('user').where({
      _id: self.globalData.identity.uid,
      openid: '{openid}'
    }).update({
      data: data
    }).then(res=>{
      let identity = self.globalData.identity
      for (let key in data) {
        identity[key] = data[key]
      }
    }).catch(console.error)
  },
  syncTempUser(uids) {
    let self = this
    const db = wx.cloud.database()
    const _ = db.command
    let list = this.globalData.temp_user
    let ids = []
    uids.forEach(id => {
      if (!list[id] && !ids.includes(id)) {
        ids.push(id)
      }
    })
    if (ids.length>0) {
      db.collection('user').where({
        _id: _.in(ids)
      }).get().then(res => {
        res.data.forEach(item => {
          list[item._id] = item
        })
        try {
          self.tempUserReadyCallback()
        } catch (e) { }
      })
    } else {
      try {
        self.tempUserReadyCallback()
      } catch (e) { }
    }
  },
  syncTempStaff(sids) {
    let self = this
    const db = wx.cloud.database()
    const _ = db.command
    let list = self.globalData.temp_staff
    let ids = []
    sids.forEach(id => {
      if (!list[id] && !ids.includes(id)) {
        ids.push(id)
      }
    })
    if (ids.length > 0) {
      db.collection('staff').where({
        _id: _.in(ids)
      }).get().then(res => {
        res.data.forEach(item => {
          list[item._id] = item
        })
        try {
          self.tempStaffReadyCallback()
        } catch (e) { }
      })
    } else {
      try {
        self.tempStaffReadyCallback()
      } catch (e) { }
    }
  },
  syncTempWechat(openids) {
    let self = this
    const db = wx.cloud.database()
    const _ = db.command
    let list = this.globalData.temp_wechat
    let ids = []
    openids.forEach(id => {
      if (!list[id] && !ids.includes(id)) {
        ids.push(id)
      }
    })
    if (ids.length > 0) {
      db.collection('user').where({
        openid: _.in(ids)
      }).get().then(res => {
        res.data.forEach(item => {
          list[item.openid] = item
        })
        try {
          self.tempWechatReadyCallback()
        } catch (e) { }
      })
    } else {
      try {
        self.tempWechatReadyCallback()
      } catch (e) { }
    }
  }
})