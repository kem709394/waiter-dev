const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../utils/tools.js')

Page({
  data: {
    config: {},
    member: null,
    contacts: {
      name: '',
      gender: 1,
      mobile: ''
    },
    menu_ids: [],
    menu_data: {},
    order_list: [],
    seat_count: 0,
    seat_price: 0,
    pack_money: 0,
    total_money: 0,
    order_remark: '',
    time_string: '',
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
    }],
    remark: {
      index: null,
      dialog: false,
      content: '',
      keyword: [],
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
  onLoad(options) {
    let self = this
    let config = app.globalData.config
    self.setData({
      config: config,
      seat_count: config.inside.seat.count,
      seat_price: config.inside.seat.price,
      'remark.keyword': tools.toArray(config.inside.remark_items),
      'clause.content': config.base.clause
    })
    if (app.globalData.identity && app.globalData.identity.contacts) {
      let contacts = app.globalData.identity.contacts
      self.setData({
        'models.name': contacts.name,
        'models.mobile': contacts.mobile,
        'contacts.name': contacts.name,
        'contacts.gender': contacts.gender,
        'contacts.mobile': contacts.mobile
      })
    }
    self.init()
  },
  init() {
    let self = this
    let order_list = wx.getStorageSync('temp_inside')
    let menu_data = app.globalData.rt_data.menu_data
    let menu_remain = app.globalData.rt_data.menu_remain
    let temp_list = []
    let menu_ids = []
    let menu_count = {}
    order_list.forEach(item1 => {
      let amount = item1.amount
      if (item1.type == 'combo') {
        let isOk = true
        item1.form.combo.forEach(item2 => {
          item2.forEach(item3 => {
            if (menu_remain.hasOwnProperty(item3.id)) {
              if (menu_count[item3.id]) {
                if (menu_remain[item3.id] < menu_count[item3.id] + amount) {
                  isOk = false
                }
              } else {
                if (menu_remain[item3.id] < amount) {
                  isOk = false
                }
              }
            }
          })
        })
        if (isOk) {
          if (menu_remain.hasOwnProperty(item1.id)) {
            if (menu_count[item1.id]) {
              if (menu_remain[item1.id] < menu_count[item1.id] + amount) {
                isOk = false
              }
            } else {
              if (menu_remain[item1.id] < amount) {
                isOk = false
              }
            }
          }
          if (isOk) {
            item1.form.combo.forEach(item2 => {
              item2.forEach(item3 => {
                if (menu_count[item3.id]) {
                  menu_count[item3.id] += amount
                } else {
                  menu_count[item3.id] = amount
                }
                menu_ids.push(item3.id)
              })
            })
            if (menu_count[item1.id]) {
              menu_count[item1.id] += amount
            } else {
              menu_count[item1.id] = amount
            }
            menu_ids.push(item1.id)
            temp_list.push(item1)
          }
        }
      } else {
        let isOk = true
        if (menu_remain.hasOwnProperty(item1.id)) {
          if (menu_count[item1.id]) {
            if (menu_remain[item1.id] < menu_count[item1.id] + amount) {
              isOk = false
            }
          } else {
            if (menu_remain[item1.id] < amount) {
              isOk = false
            }
          }
        }
        if (isOk) {
          if (menu_count[item1.id]) {
            menu_count[item1.id] += amount
          } else {
            menu_count[item1.id] = amount
          }
          menu_ids.push(item1.id)
          temp_list.push(item1)
        }
      }
    })
    self.setData({
      menu_data: menu_data,
      order_list: temp_list,
      menu_ids: menu_ids
    })
    wx.setStorage({
      key: 'temp_inside',
      data: temp_list
    })
    self.statTotal()
  },
  statTotal() {
    let self = this
    let pack_money = 0
    let total_money = 0
    let payable_money = 0
    self.data.order_list.forEach(item => {
      let menu = self.data.menu_data[item.id]
      let price = menu.price
      if (item.form.raise) {
        price += item.form.raise
      }
      if (item.form.pack) {
        if (menu.pack.mode == 'every') {
          pack_money += menu.pack.money * item.amount
        } else {
          pack_money += menu.pack.money
        }
      }
      total_money += price * item.amount
    })
    total_money += pack_money
    total_money += self.data.seat_price * self.data.seat_count
    payable_money = total_money
    self.setData({
      pack_money: pack_money,
      total_money: total_money,
      payable_money: payable_money
    })
  },
  addSeat() {
    let self = this
    self.setData({
      seat_count: ++self.data.seat_count
    })
    self.statTotal()
  },
  subSeat() {
    let self = this
    if (self.data.seat_count > 0) {
      self.setData({
        seat_count: --self.data.seat_count
      })
    }
    self.statTotal()
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.rule]: e.detail.value,
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  genderChange(e) {
    this.setData({
      'contacts.gender': e.detail.value ? 1 : 2
    })
  },
  timeChange(e) {
    this.setData({
      time_string: e.detail.value
    })
  },
  showRemark(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    if (index == undefined) {
      self.setData({
        'remark.dialog': true,
        'remark.index': null,
        'remark.content': self.data.order_remark
      })
    } else {
      let item = self.data.order_list[index]
      self.setData({
        'remark.dialog': true,
        'remark.index': index,
        'remark.content': item.remark ? item.remark : ''
      })
    }
  },
  inputRemark(e) {
    this.setData({
      'remark.content': e.detail.value
    })
  },
  tagRemark(e) {
    let self = this
    let content = self.data.remark.content
    if (content.endsWith(' ')) {
      content += e.currentTarget.dataset.value
    } else {
      content += ' ' + e.currentTarget.dataset.value
    }
    self.setData({
      'remark.content': content
    })
  },
  tapRemark(e) {
    let self = this
    if (e.detail.index == 0) {
      self.setData({
        'remark.dialog': false
      })
    } else {
      let index = self.data.remark.index
      if (index == null) {
        self.setData({
          'remark.dialog': false,
          order_remark: self.data.remark.content
        })
      } else {
        let list = self.data.order_list
        let item = list[self.data.remark.index]
        item.remark = self.data.remark.content
        self.setData({
          'remark.dialog': false,
          order_list: list
        })
      }
    }
  },
  agreeChange(e) {
    this.setData({
      'clause.isAgree': !!e.detail.value.length
    })
  },
  submitForm() {
    let self = this
    if (self.data.order_list.length == 0) {
      wx.showModal({
        title: '操作提示',
        content: '您选择的菜品已失效，请重新选择菜品',
        success(res) {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
      return
    }
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
              name: 'inside_order',
              data: {
                action: 'create_active',
                data: {
                  mode: 'reserve',
                  time_string: self.data.time_string,
                  contacts: self.data.contacts,
                  list: self.data.order_list,
                  remark: self.data.order_remark,
                  seat_count: self.data.seat_count,
                  menu_ids: self.data.menu_ids
                }
              }
            }).then(res => {
              self.data.hold = false
              let order = res.result.order
              if (res.result && res.result.errcode == 0) {
                try {
                  if (!app.globalData.identity.contacts) {
                    app.setUserData({
                      contacts: self.data.contacts
                    })
                  }
                  wx.removeStorage({
                    key: 'temp_inside'
                  })
                } catch (error) {}
                if (self.data.config.inside.arrival.payment) {
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
      name: 'inside_order',
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
              name: 'inside_order',
              data: {
                action: 'payment_success',
                payment_id: payment_id
              }
            })
            let config = self.data.config
            if (config.inside.notify.active) {
              wx.hideLoading()
              wx.requestSubscribeMessage({
                tmplIds: [config.inside.notify.template.success, config.inside.notify.template.cancel, config.inside.notify.template.finish],
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