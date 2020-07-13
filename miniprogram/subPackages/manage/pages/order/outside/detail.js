const app = getApp()
const db = wx.cloud.database()
const moment = require('../../../../../utils/moment.min.js')

Page({
  data: {
    detail: {},
    delivery: {
      list: [],
      dialog: false,
      current: null,
      buttons: [{
        text: '关闭'
      }]
    },
    refund: {
      list: [],
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
      }],
      buttons: [{
        text: '取消'
      }, {
        text: '确认'
      }]
    },
    operate: {
      print: true,
      remove: true,
      refund: false
    },
    temp_wechat: {},
    temp_staff: {}
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    let operate = self.data.operate
    if (detail.refund_state==0 && detail.payment_money>detail.refund_money) {
      operate.refund = true
    }
    self.setData({
      detail: detail,
      operate: operate
    })
    if (detail.openid) {
      app.tempWechatReadyCallback = () => {
        self.setData({
          temp_wechat: app.globalData.temp_wechat
        })
      }
      app.syncTempWechat([detail.openid])
    }
    if (detail.create_sid) {
      app.tempStaffReadyCallback = () => {
        self.setData({
          temp_staff: app.globalData.temp_staff
        })
      }
      app.syncTempStaff([detail.create_sid])
    }
    if (detail.refund_money) {
      self.getRefund(detail._id)
    }
    if (detail.delivery_state!=0) {
      self.getDelivery(detail._id) 
    }
  },
  getData(id) {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('outside_order').where({
      openid: '{openid}',
      _id: id
    }).get().then(res => {
      let detail = res.data[0]
      detail.create_time = moment(detail.create_time).format('YYYY-MM-DD HH:mm')
      if (detail.cancel_time) {
        detail.cancel_time = moment(detail.cancel_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.receive_time) {
        detail.receive_time = moment(detail.receive_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.make_time) {
        detail.make_time = moment(detail.make_time).format('YYYY-MM-DD HH:mm')
      }
      if (detail.finish_time) {
        detail.finish_time = moment(detail.finish_time).format('YYYY-MM-DD HH:mm')
      }
      self.setData({
        detail: detail
      })
      wx.hideLoading()
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  getRefund(id) {
    let self = this
    db.collection('payment_refund').where({
      order_id: id,
      order_type: 'outside'
    }).get().then(res=>{
      let list = res.data
      list.forEach(item=>{
        item.start_time = moment(item.start_time).format('YYYY-MM-DD HH:mm')
        if (item.end_time) {
          item.end_time = moment(item.end_time).format('YYYY-MM-DD HH:mm')
        }
      })
      self.setData({
        'refund.list': list
      })
    })
  },
  getDelivery(id) {
    let self = this
    db.collection('delivery').where({
      order_id: id
    }).get().then(res=>{
      let sids = []
      let list = res.data
      list.forEach(item=>{
        sids.push(item.delivery_sid)
        item.delivery_time = moment(item.delivery_time).format('YYYY-MM-DD HH:mm')
        if (item.finish_time) {
          item.finish_time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
        }
        if (item.cancel_time) {
          item.cancel_time = moment(item.cancel_time).format('YYYY-MM-DD HH:mm')
        }
      })
      self.setData({
        'delivery.list': list
      })
      app.tempStaffReadyCallback = () => {
        self.setData({
          temp_staff: app.globalData.temp_staff
        })
      }
      app.syncTempStaff(sids)
    })
  },
  print() {
    let self = this
    wx.showLoading({
      title: '操作中',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'outside_order',
      data: {
        action: 'reprint',
        id: self.data.detail._id
      },
    }).then(res => {
      console.log(res)
      wx.hideLoading()
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  remove() {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要删除当前订单？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '操作中',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'outside_order',
            data: {
              action: 'remove',
              id: self.data.detail._id
            },
          }).then(res => {
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              })
              setTimeout(function() {
                wx.navigateBack()
              }, 2000)
              app.globalData.update = true
            } else {
              wx.showToast({
                icon: 'none',
                title: '删除失败',
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
  showDelivery(e) {
    let self = this
    let current = self.data.delivery.list[e.currentTarget.dataset.index]
    self.setData({
      'delivery.dialog': true,
      'delivery.current': current
    })
  },
  tapDelivery(e) {
    this.setData({
      'delivery.dialog': false
    })
  },
  refund() {
    this.setData({
      'refund.form.note': '',
      'refund.form.money': 0,
      'refund.dialog': true
    })
  },
  tapRefund(e) {
    let self = this
    if (e.detail.index) {
      let detail = self.data.detail
      self.selectComponent('#refundForm').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
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
              id: detail._id,
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
              self.getData(detail._id)
              self.getRefund(detail._id)
              app.globalData.update = true
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
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  },
  openMap(e) {
    let address = e.currentTarget.dataset.address
    wx.openLocation({
      latitude: address.location.coordinate.coordinates[1],
      longitude: address.location.coordinate.coordinates[0],
      scale: 15,
      name: address.location.name,
      address: address.address
    })
  },
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) {}
    })
  }
})