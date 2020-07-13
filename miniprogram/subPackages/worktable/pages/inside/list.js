const app = getApp()

Page({
  data: {
    customBarHeight: 0,
    config: {},
    privilege: [],
    mode: 'arrival',
    list: [],
    arrival: {
      scrolltop: 0,
      triggered: false,
      list: [],
      count: 0
    },
    reserve: {
      scrolltop: 0,
      triggered: false,
      list: [],
      count: 0
    },
    current: null,
    actionSheet: {
      show: false,
      groups: []
    },
    table: {
      dialog: false,
      list: [],
      state: {},
      value: ''
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
    qrcode: {
      dialog: false,
      value: '',
      buttons: [{text: '关闭'}]
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
    let self = this
    self.setData({
      customBarHeight: app.globalData.customBarHeight,
      config: app.globalData.config,
      privilege: app.globalData.identity.staff.privilege,
      'table.list': app.globalData.table
    })
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'table_state'
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        let state = {}
        res.result.list.forEach(item => {
          state[item.table] = item
        })
        self.setData({
          'table.state': state
        })
      }
    })
  },
  onShow() {
    this.update()
  },
  totop() {
    let self = this
    if (self.data.mode == 'arrival') {
      self.setData({
        'arrival.scrolltop': 0
      })
    } else if (self.data.mode == 'reserve') {
      self.setData({
        'reserve.scrolltop': 0
      })
    }
  },
  refresh() {
    let self = this
    setTimeout(() => {
      self.data.list = app.globalData.rt_data.inside_order
      let openids = []
      if (self.data.mode == 'arrival') {
        let temp_list = []
        let temp_count = 0
        self.data.list.forEach(item => {
          if (item.mode == 'arrival') {
            temp_list.push(item)
            if (item.state == 10 || item.state == 11) temp_count++
          }
          if (item._openid) {
            openids.push(item._openid)
          }
        })
        self.setData({
          'arrival.triggered': false,
          'arrival.list': temp_list,
          'arrival.count': temp_count
        })
      } else if (self.data.mode == 'reserve') {
        let temp_list = []
        let temp_count = 0
        self.data.list.forEach(item => {
          if (item.mode == 'reserve') {
            temp_list.push(item)
            if (item.state == 10 || item.state == 11) temp_count++
          }
          if (item.openid) {
            openids.push(item.openid)
          }
        })
        self.setData({
          'reserve.triggered': false,
          'reserve.list': temp_list,
          'reserve.count': temp_count
        })
      }
      app.tempWechatReadyCallback = () => {
        self.setData({
          temp_wechat: app.globalData.temp_wechat
        })
      }
      app.syncTempWechat(openids)
    }, 1000)
  },
  update() {
    let self = this
    self.data.list = app.globalData.rt_data.inside_order
    let openids = []
    let arrival_list = []
    let arrival_count = 0
    let reserve_list = []
    let reserve_count = 0
    self.data.list.forEach(item => {
      if (item.mode == 'arrival') {
        arrival_list.push(item)
        if (item.state == 10 || item.state == 11) arrival_count++
      } else if (item.mode == 'reserve') {
        reserve_list.push(item)
        if (item.state == 10 || item.state == 11) reserve_count++
      }
      if (item.openid) {
        openids.push(item.openid)
      }
    })
    self.setData({
      'arrival.list': arrival_list,
      'arrival.count': arrival_count,
      'reserve.list': reserve_list,
      'reserve.count': reserve_count
    })
    app.tempWechatReadyCallback = () => {
      self.setData({
        temp_wechat: app.globalData.temp_wechat
      })
    }
    app.syncTempWechat(openids)
  },
  modeChange(e) {
    this.setData({
      mode: e.currentTarget.dataset.key
    })
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
  tableChange(e) {
    this.setData({
      'table.value': e.detail.value
    })
  },
  hideTable() {
    this.setData({
      'table.dialog': false
    })
  },
  operate(e) {
    let self = this
    let item = self.data.list.find((item) => item._id == e.currentTarget.dataset.id)
    let groups = []
    let privilege = self.data.privilege
    if (item.state==10) {
      if (privilege.includes('service_order-inside_handle')) {
        groups.push({ text: '接收', value: 'receive' })
      }
      if (privilege.includes('service_order-inside_cancel')) {
        groups.push({ text: '取消', value: 'cancel' })
      }
    } else {
      if (privilege.includes('service_order-inside_modify')) {
        groups.push({ text: '变更', value: 'alter' })
      }
      if (privilege.includes('service_order-inside_cancel')) {
        groups.push({ text: '取消', value: 'cancel' })
      }
      if (item.state==11 && privilege.includes('service_order-inside_make')) {
        groups.push({ text: '制作', value: 'make' })
      }
      if (privilege.includes('service_order-inside_finish')) {
        groups.push({ text: '完成', value: 'finish' })
      }
    }
    if (item.refund_state==0 && item.payment_money>item.refund_money) {
      groups.push({ text: '退款', value: 'refund' })
    }
    if (privilege.includes('service_order-inside_print')) {
      groups.push({ text: '打印', value: 'print' })
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
      case 'alter':
        wx.navigateTo({
          url: 'alter?id=' + current._id
        })
        break
      case 'receive':
        self.receive()
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
      case 'make':
        if (current.mode == 'reserve') {
          self.setData({
            'table.value': '',
            'table.dialog': true
          })
        } else {
          self.setData({
            'table.value': current.table
          })
          self.make()
        }
        break
      case 'print':
        self.print()
        break
      case 'finish':
        self.finish()
        break
    }
  },
  print() {
    let self = this
    wx.showLoading({
      title: '正在操作',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'inside_order',
      data: {
        action: 'reprint',
        id: self.data.current._id
      }
    }).then(res => {
      wx.hideLoading()
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  make() {
    let self = this
    let table = self.data.table.value
    let current = self.data.current
    if (table=='') {
      wx.showToast({
        icon: 'none',
        title: '请分配餐桌',
        duration: 2000
      })
      return
    }
    self.setData({
      'table.dialog': false
    })
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'inside_order',
      data: {
        action: 'make',
        id: current._id,
        table: table
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          icon: 'success',
          title: '操作成功',
          duration: 2000
        })
        setTimeout(() => {
          self.update()
        }, 2000)
      } else {
        wx.showToast({
          icon: 'none',
          title: '操作失败',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  receive() {
    let self = this
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'inside_order',
      data: {
        action: 'receive',
        id: self.data.current._id
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          icon: 'success',
          title: '操作成功！',
          duration: 2000
        })
        setTimeout(() => {
          self.update()
        }, 2000)
      } else {
        wx.showToast({
          icon: 'none',
          title: '操作失败',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
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
          if (self.data.cancel.form.refund > 0) {
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
          }
          self.setData({
            'cancel.dialog': false
          })
          wx.showLoading({
            title: '正在提交',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'inside_order',
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
                  list: app.globalData.rt_data.inside_order
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
            name: 'inside_order',
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
                  list: app.globalData.rt_data.inside_order
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
  finish() {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要完成当前订单？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在提交',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'inside_order',
            data: {
              action: 'finish',
              id: self.data.current._id
            }
          }).then(res => {
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                icon: 'success',
                title: '操作成功',
                duration: 2000
              })
              setTimeout(() => {
                self.update()
              }, 2000)
            } else {
              wx.showToast({
                icon: 'none',
                title: '操作失败',
                duration: 2000
              })
            }
          }).catch(err => {
            wx.showToast({
              icon: 'none',
              title: '系统繁忙',
              duration: 2000
            })
          })
        }
      }
    })
  },
  qrcode(e) {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'system',
      data: {
        action: 'getWxacode2',
        data: {
          scene: e.currentTarget.dataset.value,
          page: 'pages/order/inside/collect'
        }
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        self.setData({
          'qrcode.dialog': true,
          'qrcode.value': res.result.url
        })
        wx.hideLoading()
      } else {
        wx.showToast({
          icon: 'none',
          title: '加载失败',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  tapQrcode() {
    this.setData({
      'qrcode.dialog': false
    })
  },
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) {}
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  }
})