const app = getApp()

Page({
  data: {
    StatusBar: 0,
    CustomBar: 0,
    Custom: null,
    config: {},
    forbid: true
  },
  onLoad() {
    let self = this
    self.setData({
      StatusBar: app.globalData.StatusBar,
      CustomBar: app.globalData.CustomBar,
      Custom: app.globalData.Custom,
      config: app.globalData.config
    })
    wx.showLoading({
      title: '检测授权',
      mask: true
    })
    wx.getSetting({
      success(res) {
        wx.hideLoading()
        if (res.authSetting['scope.userInfo'] == undefined) {
          self.setData({
            forbid: false
          })
        } else {
          self.setData({
            forbid: true
          })
        }
      }
    })
  },
  setting() {
    let self = this
    wx.openSetting({
      success(res) {
        if (res.authSetting['scope.userInfo']) {
          self.setData({
            forbid: false
          })
          self.getInfo2()
        } else {
          self.setData({
            forbid: true
          })
          wx.showToast({
            title: '用户信息授权失败',
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
  },
  getInfo(e) {
    let self = this
    if (e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo
      try {
        app.userInfoReadyCallback()
      } catch (e) {}
      wx.showLoading({
        title: '正在登录',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'system',
        data: {
          action: 'login',
          data: e.detail.userInfo
        }
      }).then(res => {
        wx.hideLoading()
        wx.navigateBack()
        if (res.result && res.result.errcode == 0) {
          app.globalData.identity = res.result.identity
          try {
            app.identityReadyCallback()
          } catch (e) {
            wx.showToast({
              title: '登录成功',
              icon: 'success',
              duration: 2000
            })
          }
        } else {
          try {
            app.identityFailCallback()
          } catch (e) {
            wx.showToast({
              title: '登录失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }).catch(err => {
        wx.navigateBack()
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    } else {
      self.setData({
        forbid: true
      })
      wx.showToast({
        title: '用户信息授权失败',
        icon: 'none',
        duration: 2000
      })
    }
  },
  getInfo2() {
    let self = this
    wx.getUserInfo({
      lang: 'zh_CN',
      success(res) {
        app.globalData.userInfo = res.userInfo
        try {
          app.userInfoReadyCallback()
        } catch (e) {}
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
          wx.navigateBack()
          if (res.result && res.result.errcode == 0) {
            app.globalData.identity = res.result.identity
            try {
              app.identityReadyCallback()
            } catch (e) {
              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 2000
              })
            }
          } else {
            try {
              app.identityFailCallback()
            } catch (e) {
              wx.showToast({
                title: '登录失败',
                icon: 'none',
                duration: 2000
              })
            }
          }
        }).catch(err => {
          wx.navigateBack()
          wx.showToast({
            title: '系统繁忙',
            icon: 'none',
            duration: 2000
          })
        })
      }
    })
  },
  refuse() {
    wx.navigateBack()
    try {
      app.identityFailCallback()
    } catch (e) {}
  }
})