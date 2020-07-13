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
    pack_money: 0,
    total_money: 0,
    payable_money: 0,
    delivery_money: 0,
    order_remark: '',
    distance_title: '',
    time_string1: '',
    time_string2: '',
    mode: {
      value: '',
      options: []
    },
    tableware: {
      title: '',
      index: null,
      options: ['无需餐具', '1份', '2份', '3份', '4份', '5份', '6份', '7份', '8份', '9份', '10份', '10份以上']
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
    }],
    address: null,
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
  onLoad() {
    let self = this
    let config = app.globalData.config
    let mode_options = []
    if (config.outside.delivery.active) {
      mode_options.push({
        value: 'delivery',
        name: '外卖配送'
      })
    }
    if (config.outside.takeaway.active) {
      mode_options.push({
        value: 'takeaway',
        name: '到店自提'
      })
    }
    self.setData({
      config: config,
      'mode.value': mode_options[0].value,
      'mode.options': mode_options,
      'remark.keyword': tools.toArray(config.outside.remark_items),
      'clause.content': config.base.clause
    })
    if (app.globalData.identity.contacts) {
      let contacts = app.globalData.identity.contacts
      self.setData({
        'contacts.name': contacts.name,
        'contacts.gender': contacts.gender,
        'contacts.mobile': contacts.mobile,
        'models.name': contacts.name,
        'models.mobile': contacts.mobile
      })
    }
    self.init()
    self.location()
  },
  init() {
    try {
      let self = this
      let order_list = wx.getStorageSync('temp_outside')
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
        key: 'temp_outside',
        data: temp_list
      })
      self.statTotal()
    } catch (e) {
      console.error(e)
    }
  },
  checkdeliveryMoney(distance) {
    let self = this
    let flag = false
    let minMoney = 0
    let maxMoney = 0
    app.globalData.config.outside.delivery.section.forEach(item=>{
      if (distance>=item.range[0] && distance<item.range[1]) {
        minMoney = item.money
        flag = true
      }
      if (item.money>maxMoney) {
        maxMoney = item.money
      }
    })
    self.setData({
      delivery_money: flag?minMoney:maxMoney
    })
    self.statTotal()
  },
  location() {
    let self = this
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        let coordinate = self.data.config.base.location.coordinate
        let distance = tools.getDistance(res.latitude, res.longitude, coordinate.coordinates[1], coordinate.coordinates[0])
        if (distance > 1000) {
          self.setData({
            distance_title: (distance / 1000).toFixed(1) + '公里'
          })
        } else {
          self.setData({
            distance_title: distance + '米'
          })
        }
      },
      fail(err) {
        wx.showToast({
          title: '获取当前位置失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },
  statTotal() {
    let self = this
    let total_money = 0
    let pack_money = 0
    let payable_money = 0
    self.data.order_list.forEach(item => {
      let menu = self.data.menu_data[item.id]
      let price = menu.price
      if (item.form && item.form.raise) {
        price += item.form.raise
      }
      if (menu.pack.mode == 'every') {
        pack_money += menu.pack.money * item.amount
      } else {
        pack_money += menu.pack.money
      }
      total_money += price * item.amount
    })
    total_money += pack_money
    if (self.data.mode.value == 'delivery') {
      total_money += self.data.delivery_money
    }
    payable_money = total_money
    self.setData({
      pack_money: pack_money,
      total_money: total_money,
      payable_money: payable_money
    })
  },
  modeChange(e) {
    this.setData({
      'mode.value': e.currentTarget.dataset.key
    })
    this.statTotal()
  },
  addressChange(e) {
    let self = this
    self.setData({
      address: e.detail
    })
    self.checkdeliveryMoney(e.detail.distance)
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.rule]: e.detail.value,
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  genderChange(e) {
    this.setData({
      'takeaway.contacts.gender': e.detail.value ? 1 : 2
    })
  },
  tablewareChange(e) {
    let self = this
    self.setData({
      'tableware.index': e.detail.value,
      'tableware.title': self.data.tableware.options[e.detail.value]
    })
  },
  timeChange1(e) {
    this.setData({
      time_string1: e.detail.value
    })
  },
  timeChange2(e) {
    this.setData({
      time_string2: e.detail.value
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
    let data = {
      list: self.data.order_list,
      tableware: self.data.tableware.title,
      remark: self.data.order_remark,
      menu_ids: self.data.menu_ids
    }
    if (self.data.mode.value == 'delivery') {
      data.mode = 'delivery'
      let address = self.data.address
      if (address == null) {
        self.setData({
          error: '配送地址是必选项'
        })
        return
      }
      if (self.data.time_string1 == '') {
        self.setData({
          error: '商家已停止配送服务'
        })
        return
      }
      data.contacts = address.contacts
      data.address = address.content
      data.location = address.location
      data.time_string = self.data.time_string1
      data.delivery_money = self.data.delivery_money
      self.submit(data)
    } else {
      data.mode = 'takeaway'
      self.selectComponent('#form').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          if (self.data.time_string2 == '') {
            self.setData({
              error: '商家已停止自提服务'
            })
            return
          }
          data.time_string = self.data.time_string2
          data.contacts = self.data.contacts
          self.submit(data)
        }
      })
    }
  },
  submit(data) {
    let self = this
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    if (!self.data.hold) {
      self.data.hold = true
      wx.cloud.callFunction({
        name: 'outside_order',
        data: {
          action: 'create_active',
          data: data
        }
      }).then(res => {
        self.data.hold = false
        let order = res.result.order
        if (res.result && res.result.errcode == 0) {
          try {
            if (data.mode == 'takeaway') {
              if (!app.globalData.identity.contacts) {
                app.setUserData({
                  contacts: data.contacts
                })
              }
            }
            wx.removeStorage({
              key: 'temp_outside'
            })
          } catch (error) {}
          if (self.data.config.outside.payment) {
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
      }).catch(err=>{
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    }
  },
  payment(order) {
    let self = this
    wx.showLoading({
      title: '正在支付'
    })
    wx.cloud.callFunction({
      name: 'outside_order',
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
              name: 'outside_order',
              data: {
                action: 'payment_success',
                payment_id: payment_id
              }
            })
            let config = self.data.config
            if (config.outside.notify.active) {
              wx.hideLoading()
              let tmplIds = [config.outside.notify.template.success, config.outside.notify.template.cancel, config.outside.notify.template.finish]
              if (self.data.mode.value == 'delivery' && config.outside.delivery.notify.active) {
                tmplIds[0] = config.outside.delivery.notify.template.sendout
              }
              wx.requestSubscribeMessage({
                tmplIds: tmplIds,
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
  showMap() {
    let self = this
    let location = self.data.config.base.location
    wx.openLocation({
      name: location.name,
      address: self.data.config.base.address,
      latitude: location.coordinate.coordinates[1],
      longitude: location.coordinate.coordinates[0],
      scale: 18
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