const app = getApp()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    customBarHeight: 0,
    config: {},
    privilege: [],
    scrolltop: 0,
    triggered: false,
    list: [],
    current: null,
    actionSheet: {
      show: false,
      groups: []
    },
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
      }]
    },
    refund: {
      dialog: false,
      form: {
        note: '',
        money: 0
      },
      rules: [{
        name: 'note',
        rules: [{
          required: true,
          message: '退款说明是必填项'
        }]
      }, {
        name: 'money',
        rules: [{
          required: true,
          message: '退款金额是必填项'
        }]
      }]
    },
    overdue: {
      dialog: false,
      form: {
        note: ''
      },
      rules: [{
        name: 'note',
        rules: [{
          required: true,
          message: '过期说明是必填项'
        }]
      }]
    },
    buttons: [{
      text: '取消'
    }, {
      text: '确认'
    }],
    password: '',
    temp_wechat: {}
  },
  onLoad() {
    this.setData({
      customBarHeight: app.globalData.customBarHeight,
      config: app.globalData.config,
      privilege: app.globalData.identity.staff.privilege
    })
  },
  onShow() {
    let self = this
    let list = app.globalData.rt_data.book_order
    let openids = []
    list.forEach(item => {
      if (item.openid) {
        openids.push(item.openid)
      }
    })
    self.setData({
      list: list
    })
    app.tempWechatReadyCallback = () => {
      self.setData({
        temp_wechat: app.globalData.temp_wechat
      })
    }
    app.syncTempWechat(openids)
  },
  totop() {
    this.setData({
      scrolltop: 0
    })
  },
  refresh() {
    let self = this
    setTimeout(() => {
      let list = app.globalData.rt_data.book_order
      let openids = []
      list.forEach(item => {
        if (item.openid) {
          openids.push(item.openid)
        }
      })
      self.setData({
        triggered: false,
        list: list
      })
      app.tempWechatReadyCallback = () => {
        self.setData({
          temp_wechat: app.globalData.temp_wechat
        })
      }
      app.syncTempWechat(openids)
    }, 1000)
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  inputNumber(e) {
    this.setData({
      [e.currentTarget.dataset.field]: Number(e.detail.value)
    })
  },
  inputDigit(e) {
    let self = this
    let value = e.detail.value
    if (value.charAt(value.length - 1) != '.') {
      self.setData({
        [e.currentTarget.dataset.field]: Number(value)
      })
    }
  },
  operate(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    let item = self.data.list[index]
    let groups = []
    let privilege = self.data.privilege
    if (item.state==10) {
      if (privilege.includes('service_order-book_handle')) {
        groups.push({ text: '接收', value: 'receive' })
      }
    } else {
      if (privilege.includes('service_order-book_modify')) {
        groups.push({ text: '变更', value: 'alter' })
      }
      if (privilege.includes('service_order-book_overdue')) {
        groups.push({ text: '过期', value: 'overdue' })
      }
      if (privilege.includes('service_order-book_finish')) {
        groups.push({ text: '完成', value: 'finish' })
      }
    }
    if (privilege.includes('service_order-book_cancel')) {
      groups.push({ text: '取消', value: 'cancel' })
    }
    if (item.refund_state==0&&item.payment_money>item.refund_money) {
      groups.push({ text: '退款', value: 'refund' })
    }
    self.setData({
      current: item,
      'actionSheet.show': true,
      'actionSheet.groups': groups
    })
  },
  tapSheet(e) {
    let self = this
    self.setData({
      'actionSheet.show': false,
    })
    let current = self.data.current
    switch(e.detail.value) {
      case 'receive':
        app.globalData.temp_data = tools.objCopy(current)
        wx.navigateTo({
          url: 'receive?id=' + current._id
        })
        break
      case 'alter':
        app.globalData.temp_data = tools.objCopy(current)
        wx.navigateTo({
          url: 'alter?id=' + current._id
        })
        break
      case 'cancel':
        if (current.refund_state == 1) {
          wx.showToast({
            title: '还有退款未完成',
            icon: 'none',
            duration: 2000
          })
        } else {
          self.setData({
            password: '',
            'cancel.form.note': '',
            'cancel.dialog': true
          })
        }
        break
      case 'refund':
        self.setData({
          password: '',
          'refund.form.note': '',
          'refund.form.money': 0,
          'refund.dialog': true
        })
        break
      case 'overdue':
        self.setData({
          password: '',
          'overdue.form.note': '',
          'overdue.dialog': true
        })
        break
      case 'finish':
        self.finish()
        break

    }
  }, 
  tapCancel(e) {
    let self = this
    if (e.detail.index) {
      let current = self.data.current
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
            title: '正在提交',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'cancel_passive',
              id: current._id,
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
                self.setData({
                  list: app.globalData.rt_data.book_order
                })
              }, 2000)
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
        }
      })
    } else {
      self.setData({
        'cancel.dialog': false
      })
    }
  },
  tapRefund(e) {
    let self = this
    if (e.detail.index) {
      let current = self.data.current
      self.selectComponent('#refundForm').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          if (self.data.password == '') {
            self.setData({
              error: '请输入退款密码'
            })
            return
          } else {
            if (self.data.password != app.globalData.config.password.refund) {
              self.setData({
                error: '退款密码错误'
              })
              return
            }
          }
          self.setData({
            'refund.dialog': false
          })
          let form = self.data.refund.form
          wx.showLoading({
            title: '正在提交',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'refund',
              id: current._id,
              data: {
                money: parseInt(form.money * 100),
                note: form.note
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
                self.setData({
                  list: app.globalData.rt_data.book_order
                })
              }, 2000)
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
        }
      })
    } else {
      self.setData({
        'refund.dialog': false
      })
    }
  },
  tapOverdue(e) {
    let self = this
    if (e.detail.index) {
      let current = self.data.current
      self.selectComponent('#overdueForm').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          self.setData({
            'overdue.dialog': false
          })
          wx.showLoading({
            title: '正在提交',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'overdue',
              id: current._id,
              data: {
                note: self.data.note
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
                self.setData({
                  list: app.globalData.rt_data.book_order
                })
              }, 2000)
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
        }
      })
    } else {
      self.setData({
        'overdue.dialog': false
      })
    }
  },
  finish() {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要完成当前订单？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'finish',
              id: self.data.current._id
            },
          }).then(res => {
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                icon: 'success',
                title: '操作成功',
                duration: 2000
              })
              setTimeout(() => {
                self.setData({
                  list: app.globalData.rt_data.book_order
                })
              }, 2000)
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
        }
      }
    })
  },
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) { }
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  }
})