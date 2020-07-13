const app = getApp()
const db = wx.cloud.database()
const moment = require('../../../utils/moment.min.js')

Page({
  data: {
    config: null,
    detail: null,
    member: null,
    operate: {},
    cancel: {
      dialog: false,
      form: {
        note: ''
      },
      rules: [{
        name: 'note',
        rules: [{
          required: true,
          message: '取消说明是必填项'
        }]
      }],
      buttons: [{
        text: '取消'
      }, {
        text: '确认'
      }]
    }
  },
  onLoad(options) {
    let self = this
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
    self.getData(options.id)
  },
  getData(id) {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('book_order').where({
      _id: id,
      openid: '{openid}'
    }).get().then(res => {
      let detail = res.data[0]
      detail.create_time = moment(detail.create_time).format('YYYY-MM-DD HH:mm')
      if (detail.cancel_time) {
        detail.cancel_time = moment(detail.cancel_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.receive_time) {
        detail.receive_time = moment(detail.receive_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.finish_time) {
        detail.finish_time = moment(detail.finish_time).format('YYYY-MM-DD HH:mm')
      }
      let operate = {
        payment: false,
        cancel: false
      }
      if (detail.state < 20) {
        if (detail.state == 0) {
          operate.payment = true
        }
        if (detail.state == 10) {
          operate.cancel = true
        }
      }
      self.setData({
        detail: detail,
        operate: operate
      })
      wx.hideLoading()
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  cancel() {
    this.setData({
      'cancel.form.note': '',
      'cancel.dialog': true
    })
  },
  tapCancel(e) {
    let self = this
    if (e.detail.index) {
      self.selectComponent('#cancelForm').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          self.setData({
            'cancel.dialog': false
          })
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'cancel_active',
              id: self.data.detail._id,
              data: {
                note: self.data.cancel.form.note
              }
            }
          }).then(res => {
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                icon: 'success',
                title: '操作成功',
                duration: 2000
              })
              setTimeout(() => {
                self.getData(self.data.detail._id)
              }, 2000)
              app.globalData.update = true
            } else {
              wx.showToast({
                icon: 'none',
                title: '操作失败',
                duration: 2000
              })
            }
          }).catch(err=>{
            wx.showToast({
              icon: 'none',
              title: '系统繁忙',
              duration: 2000
            })
          })
        }
      })
    } else {
      self.setData({
        'cancel.dialog': false
      })
    }
  },
  payment() {
    let self = this
    let detail = self.data.detail
    if (detail.payable_money==0) {
      wx.showToast({
        title: '付款金额不能为0',
        icon: 'none',
        duration: 2000
      })
      return
    }
    wx.showLoading({
      title: '正在支付'
    })
    wx.cloud.callFunction({
      name: 'book_order',
      data: {
        action: 'payment',
        id: detail._id
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
            setTimeout(() => {
              self.getData(detail._id)
            }, 2000)
            app.globalData.update = true
          },
          fail(res) {
            wx.showToast({
              title: '支付中止',
              icon: 'none',
              duration: 2000
            })
          }
        })
      } else {
        wx.showToast({
          title: '系统繁忙',
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
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) { }
    })
  }
})