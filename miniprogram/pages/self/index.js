const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 0,
    customBarHeight: 0,
    triggered: false,
    config: {},
    granted: false,
    userInfo: null,
    identity: null,
    contacts: {
      dialog: false,
      form: {
        name: '',
        gender: 1,
        mobile: ''
      },
      models: {},
      rules: [{
        name: 'name',
        rules: [{
          required: true,
          message: '姓名称呼是必填项'
        }]
      }, {
        name: 'mobile',
        rules: [{
          required: true,
          message: '手机号码是必填项'
        }, {
          mobile: true,
          message: '手机号码格式错误'
        }]
      }],
      buttons: [{
        text: '取消'
      },{
        text: '确认'
      }]
    }
  },
  onLoad() {
    let self = this
    self.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      customBarHeight: app.globalData.customBarHeight,
      config: app.globalData.config
    })
    if (app.globalData.identity) {
      self.init()
    } else {
      app.identityReadyCallback = () => {
        self.init()
      }
      app.authorize()
    }
  },
  onShow() {
    let self = this
    if (!this.data.granted && app.globalData.identity) {
      self.init()
    } else {
      self.setData({
        identity: app.globalData.identity
      })
    }
  },
  init() {
    this.setData({
      granted: true,
      userInfo: app.globalData.userInfo,
      identity: app.globalData.identity
    })
  },
  bindMobile(e) {
    let self = this
    wx.showLoading({
      title: '正在绑定',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'system',
      data: {
        action: 'bindMobile',
        phoneInfo: wx.cloud.CloudID(e.detail.cloudID)
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          title: '绑定成功',
          icon: 'success',
          duration: 2000
        })
        self.refresh()
      } else {
        wx.showToast({
          title: '绑定失败',
          icon: 'none',
          duration: 2000
        })
      }
    }).catch(err=>{
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  inputChange(e) {
    let self = this
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: e.detail.value,
        [e.currentTarget.dataset.field]: e.detail.value
      })
    } else {
      self.setData({
        [e.currentTarget.dataset.field]: e.detail.value
      })
    }
  },
  genderChange(e) {
    this.setData({
      'contacts.form.gender': e.detail.value ? 1 : 2
    })
  },
  showContacts() {
    let self = this
    if (self.data.identity.contacts) {
      let contacts = self.data.identity.contacts
      self.setData({
        'contacts.form.name': contacts.name,
        'contacts.form.gender': contacts.gender,
        'contacts.form.mobile': contacts.mobile,
        'contacts.models.name': contacts.name,
        'contacts.models.mobile': contacts.mobile,
        'contacts.dialog': true
      })
    } else {
      self.setData({
        'contacts.dialog': true
      })
    }
  },
  tapContacts(e) {
    let self = this
    if (e.detail.index) {
      self.selectComponent('#form').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          let form = self.data.contacts.form
          wx.showLoading({
            title: '正在保存',
            mask: true
          })
          db.collection('user').where({
            _id: app.globalData.identity.uid,
            openid: '{openid}'
          }).update({
            data: {
              contacts: form
            }
          }).then(res=>{
            wx.showToast({
              title: '保存成功',
              icon: 'success',
              duration: 2000
            })
            let identity = self.data.identity
            identity.contacts = form
            wx.setStorage({
              key: 'identity',
              data: identity
            })
            self.setData({
              identity: identity,
              'contacts.dialog': false
            })
          }).catch(err=>{
            wx.showToast({
              title: '系统繁忙',
              icon: 'none',
              duration: 2000
            })
          })
        }
      })
    } else {
      self.setData({
        'contacts.dialog': false
      })
    }
  },
  refresh() {
    let self = this
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            lang: 'zh_CN',
            success: function (res) {
              self.setData({
                triggered: false
              })
              app.globalData.userInfo = res.userInfo
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
                if (res.result) {
                  if (res.result.errcode == 0) {
                    wx.showToast({
                      title: '登录成功',
                      icon: 'success',
                      duration: 2000
                    })
                    app.globalData.identity = res.result.identity
                    self.init()
                  } else {
                    wx.showToast({
                      title: res.result.errmsg,
                      icon: 'none',
                      duration: 2000
                    })
                  }
                } else {
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none',
                    duration: 2000
                  })
                }
              }).catch(err=>{
                wx.showToast({
                  title: '系统繁忙',
                  icon: 'none',
                  duration: 2000
                })
              })
            }
          })
        } else {
          app.identityReadyCallback = () => {
            self.setData({
              triggered: false
            })
            self.init()
          }
          wx.navigateTo({
            url: '/pages/authorize/index',
          })
        }
      }
    })
  }
})