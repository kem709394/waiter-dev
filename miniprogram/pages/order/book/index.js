const app = getApp()
const db = wx.cloud.database()
const moment = require('../../../utils/moment.min.js')

Page({
  data: {
    config: {},
    granted: false,
    time: '',
    date: {
      start: '',
      end: ''
    },
    form: {
      contacts: {
        name: '',
        gender: 1,
        mobile: ''
      },
      date_string: '',
      time_range: [],
      amount: 0,
      remark: ''
    },
    models: {},
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '您的称呼是必填项'
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
    }, {
      name: 'amount',
      rules: [{
        required: true,
        message: '使用人数是必填项'
      }, {
        range: [1, 100],
        message: '使用人数范围为1和100之间'
      }]
    }],
    remark: {
      dialog: false,
      content: '',
      buttons: [{
        text: '取消'
      },{
        text: '确认'
      }]
    },
    clause: {
      dialog: false,
      isAgree: true,
      content: '',
      buttons: [{
        text: '确认'
      }]
    }
  },
  onLoad() {
    let self = this
    if (app.globalData.config) {
      let config = app.globalData.config
      self.setData({
        config: config,
        'clause.content': config.base.clause
      })
      self.login()
    } else {
      app.configReadyCallback = () => {
        let config = app.globalData.config
        self.setData({
          config: config,
          'clause.content': config.base.clause
        })
        self.login()
      }
    }
  },
  onShareAppMessage() {
    let base = this.data.config.base
    return {
      title: base.name + '-订桌',
      path: '/pages/order/book/index',
      imageUrl: base.avatar
    }
  },
  login() {
    let self = this
    if (app.globalData.identity) {
      self.setData({
        granted: true
      })
      self.init()
    } else {
      app.identityReadyCallback = () => {
        self.setData({
          granted: true
        })
        self.init()
      }
      app.identityFailCallback = () => {
        self.init()
      }
      app.authorize()
    }
  },
  init() {
    let self = this
    let time = moment().format('HH:mm')
    let date0 = moment().format('YYYY-MM-DD')
    let date1 = moment().add(self.data.config.book.max_day, 'days').format('YYYY-MM-DD')
    self.setData({
      time: time,
      'date.start': date0,
      'date.end': date1,
      'form.date_string': date0,
      'form.time_range[0]': time,
      'form.time_range[1]': time
    })
    if (app.globalData.identity.contacts) {
      let contacts = app.globalData.identity.contacts
      self.setData({
        'models.name': contacts.name,
        'models.mobile': contacts.mobile,
        'models.amount': 1,
        'form.amount': 1,
        'form.contacts.name': contacts.name,
        'form.contacts.gender': contacts.gender,
        'form.contacts.mobile': contacts.mobile
      })
    }
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
  inputNumber(e) {
    let self = this
    let value = e.detail.value
    if (/^[0-9]*$/.test(value)) {
      self.setData({
        [e.currentTarget.dataset.field]: Number(value)
      })
    }
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: value
      })
    }
  },
  genderChange(e) {
    this.setData({
      'form.contacts.gender': e.detail.value ? 1 : 2
    })
  },
  dateChange(e) {
    let self = this
    let date = e.detail.value
    if (moment().isBefore(e.detail.value)) {
      self.setData({
        time: '',
        'form.date_string': date
      })
    } else {
      let time = moment().format('HH:mm')
      self.setData({
        time: time,
        'form.date_string': date,
        'form.time_range[0]': time,
        'form.time_range[1]': time
      })
    }
  },
  time0Change(e) {
    this.setData({
      'form.time_range[0]': e.detail.value,
      'form.time_range[1]': e.detail.value
    })
  },
  time1Change(e) {
    this.setData({
      'form.time_range[1]': e.detail.value
    })
  },
  showRemark() {
    let self = this
    self.setData({
      'remark.dialog': true,
      'remark.content': self.data.form.remark
    })
  },
  inputRemark(e) {
    this.setData({
      'remark.content': e.detail.value
    })
  },
  tapRemark(e) {
    let self = this
    if (e.detail.index == 0) {
      self.setData({
        'remark.dialog': false
      })
    } else {
      self.setData({
        'remark.dialog': false,
        'form.remark': self.data.remark.content
      })
    }
  },
  agreeChange(e) {
    this.setData({
      'clause.isAgree': !!e.detail.value.length
    })
  },
  submitForm() {
    let self = this
    self.selectComponent('#form').validate((valid, errors) => {
      if (!valid) {
        const firstError = Object.keys(errors)
        if (firstError.length) {
          self.setData({
            error: errors[firstError[0]].message
          })
        }
      } else {
        if (self.data.clause.isAgree) {
          wx.showLoading({
            title: '正在提交',
            mask: true
          })
          if (!self.data.hold) {
            self.data.hold = true
            wx.cloud.callFunction({
              name: 'book_order',
              data: {
                action: 'create_active',
                data: self.data.form
              }
            }).then(res => {
              self.data.hold = false
              let order = res.result.order
              if (res.result && res.result.errcode == 0) {
                if (!app.globalData.identity.contacts) {
                  app.setUserData({
                    contacts: self.data.form.contacts
                  })
                }
                if (self.data.config.book.earnest_money>0) {
                  self.payment(order)
                } else {
                  wx.redirectTo({
                    url: 'detail?id=' + order.order_id
                  })
                }
              } else {
                wx.showToast({
                  title: '系统繁忙',
                  icon: 'none',
                  duration: 2000
                })
              }
            }).catch(err => {
              self.data.hold = false
              wx.showToast({
                title: '系统繁忙',
                icon: 'none',
                duration: 2000
              })
            })
          }
        } else {
          self.setData({
            error: '请阅读并同意相关条款'
          })
        }
      }
    })
  },
  payment(order) {
    let self = this
    wx.showLoading({
      title: '正在支付'
    })
    wx.cloud.callFunction({
      name: 'book_order',
      data: {
        action: 'payment',
        id: order.order_id
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        let payment = res.result.payment
        let payment_id = res.result.payment_id
        wx.requestPayment({
          timeStamp: payment.timeStamp,
          nonceStr: payment.nonceStr,
          package: payment.package,
          signType: payment.signType,
          paySign: payment.paySign,
          success(res) {
            wx.cloud.callFunction({
              name: 'book_order',
              data: {
                action: 'payment_success',
                payment_id: payment_id
              }
            })
            let config = self.data.config
            if (config.book.notify.active) {
              wx.hideLoading()
              wx.requestSubscribeMessage({
                tmplIds: [config.book.notify.template.success, config.book.notify.template.refund, config.book.notify.template.cancel],
                success(res) {
                  wx.redirectTo({
                    url: 'detail?id=' + order.order_id
                  })
                },
                fail(err) {
                  wx.redirectTo({
                    url: 'detail?id=' + order.order_id
                  })
                }
              })
            } else {
              setTimeout(() => {
                wx.redirectTo({
                  url: 'detail?id=' + order.order_id
                })
              }, 2000)
            }
          },
          fail(res) {
            wx.showToast({
              title: '支付中止',
              icon: 'none',
              duration: 2000
            })
            setTimeout(() => {
              wx.redirectTo({
                url: 'detail?id=' + order.order_id
              })
            }, 2000)
          }
        })
      } else {
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
        setTimeout(() => {
          wx.redirectTo({
            url: 'detail?id=' + order.order_id
          })
        }, 2000)
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        wx.redirectTo({
          url: 'detail?id=' + order.order_id
        })
      }, 2000)
    })
  },
  showClause() {
    this.setData({
      'clause.dialog': true
    })
  },
  tapClause(e) {
    this.setData({
      'clause.dialog': false
    })
  }
})