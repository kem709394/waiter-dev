const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    customBarHeight: 0,
    config: {},
    privilege: [],
    watcher: {
      staff: null
    },
    mode: 'delivery',
    list: [],
    delivery: {
      scrolltop: 0,
      triggered: false,
      list: [],
      count: 0
    },
    delivery_state: {
      detail: null,
      dialog: false
    },
    delivery_staff: {
      list: [],
      dialog: false
    },
    takeaway: {
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
        moeny: 0
      },
      rules: [{
        name: 'note',
        rules: [{
          required: true,
          message: '退款说明是必填项'
        }]
      }, {
        name: 'moeny',
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
    temp_wechat: {},
    temp_staff: {}
  },
  onLoad() {
    let self = this
    self.setData({
      customBarHeight: app.globalData.customBarHeight,
      config: app.globalData.config,
      privilege: app.globalData.identity.staff.privilege
    })
    self.listenDeliveryStaff()
  },
  onUnload() {
    let self = this
    if (self.data.watcher.staff) {
      self.data.watcher.staff.close()
    }
  },
  onShow() {
    this.update()
  },
  listenDeliveryStaff() {
    let self = this
    self.data.watcher = db.collection('staff').where({
      is_deleted: false,
      state: 1,
      privilege: 'service_function-delivery'
    }).orderBy('remain_delivery_notify', 'desc').watch({
      onChange: function(snapshot) {
        if (app.globalData.identity.staff._id == '0') {
          self.setData({
            'delivery_staff.list': snapshot.docs
          })
        } else {
          let list = []
          snapshot.docs.forEach(item => {
            if (item._id != '0') {
              list.push(item)
            }
          })
          self.setData({
            'delivery_staff.list': list
          })
        }
      },
      onError: function(err) {
        console.log('reconnect staff')
        setTimeout(() => {
          self.listenDeliveryStaff()
        }, 3000)
      }
    })
  },
  showDeliveryStaff() {
    this.setData({
      'delivery_staff.dialog': true
    })
  },
  hideDeliveryStaff() {
    this.setData({
      'delivery_staff.dialog': false
    })
  },
  totop() {
    let self = this
    if (self.data.mode == 'delivery') {
      self.setData({
        'delivery.scrolltop': 0
      })
    } else if (self.data.mode == 'takeaway') {
      self.setData({
        'takeaway.scrolltop': 0
      })
    }
  },
  refresh() {
    let self = this
    setTimeout(() => {
      let openids = []
      self.data.list = app.globalData.rt_data.outside_order
      if (self.data.mode == 'delivery') {
        let temp_list = []
        let temp_count = 0
        self.data.list.forEach(item => {
          if (item.mode == 'delivery') {
            temp_list.push(item)
            if (item.state == 10 || item.state == 11) temp_count++
          }
          if (item.openid) {
            openids.push(item.openid)
          }
        })
        self.setData({
          'delivery.triggered': false,
          'delivery.list': temp_list,
          'delivery.count': temp_count
        })
      } else if (self.data.mode == 'takeaway') {
        let temp_list = []
        let temp_count = 0
        self.data.list.forEach(item => {
          if (item.mode == 'takeaway') {
            temp_list.push(item)
            if (item.state == 10 || item.state == 11) temp_count++
          }
          if (item.openid) {
            openids.push(item.openid)
          }
        })
        self.setData({
          'takeaway.triggered': false,
          'takeaway.list': temp_list,
          'takeaway.count': temp_count
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
    let openids = []
    let delivery_list = []
    let delivery_count = 0
    let takeaway_list = []
    let takeaway_count = 0
    self.data.list = app.globalData.rt_data.outside_order
    self.data.list.forEach(item => {
      if (item.mode == 'delivery') {
        delivery_list.push(item)
        if (item.state == 10 || item.state == 11) delivery_count++
      } else if (item.mode == 'takeaway') {
        takeaway_list.push(item)
        if (item.state == 10 || item.state == 11) takeaway_count++
      }
      if (item.openid) {
        openids.push(item.openid)
      }
    })
    self.setData({
      'delivery.list': delivery_list,
      'delivery.count': delivery_count,
      'takeaway.list': takeaway_list,
      'takeaway.count': takeaway_count
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
      if (item.payment_money-item.refund_money) {
        groups.push({ text: '退款', value: 'refund' })
      }
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
      name: 'outside_order',
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
    let current = self.data.current
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'outside_order',
      data: {
        action: 'make',
        id: current._id
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
  receive() {
    let self = this
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'outside_order',
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
            name: 'outside_order',
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
                  list: app.globalData.rt_data.outside_order
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
            name: 'outside_order',
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
                  list: app.globalData.rt_data.outside_order
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
            name: 'outside_order',
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
          page: 'pages/order/outside/collect'
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
  delivery(e) {
    let self = this
    db.collection('delivery').doc(e.currentTarget.dataset.id).get().then(res=>{
      let detail = res.data
      detail.delivery_time = moment(detail.delivery_time).format('YYYY-MM-DD HH:mm')
      if (detail.cancel_time) {
        detail.cancel_time = moment(detail.cancel_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.finish_time) {
        detail.finish_time = moment(detail.finish_time).format('YYYY-MM-DD HH:mm')
      }
      app.tempStaffReadyCallback = () => {
        self.setData({
          temp_staff: app.globalData.temp_staff
        })
      }
      app.syncTempStaff([detail.delivery_sid])
      self.setData({
        'delivery_state.detail': detail,
        'delivery_state.dialog': true
      })
    })
  },
  tapDelivery(e) {
    this.setData({
      'delivery_state.dialog': false
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
  },
  callWeixin(e) {
    wx.showLoading({
      title: '正在通知',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'delivery',
      data: {
        action: 'wechat_notify',
        staff_id: e.currentTarget.dataset.id
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          title: '通知成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '通知失败',
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
  openMap(e) {
    let address = e.currentTarget.dataset.address
    let location = e.currentTarget.dataset.location
    wx.openLocation({
      latitude: location.coordinate.coordinates[1],
      longitude: location.coordinate.coordinates[0],
      scale: 15,
      name: location.name,
      address: address
    })
  }
})