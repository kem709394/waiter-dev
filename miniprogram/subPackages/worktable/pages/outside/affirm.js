const app = getApp()
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    config: {},
    contacts: {
      name: '',
      gender: 1,
      mobile: ''
    },
    address: '',
    menu_ids: [],
    menu_data: {},
    order_list: [],
    pack_money: 0,
    total_money: 0,
    reward_money: 0,
    payable_money: 0,
    delivery_money: 0,
    order_remark: '',
    time_string1: '0',
    time_string2: '0',
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
        message: '客户称呼是必填项'
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
      'remark.keyword': tools.toArray(config.outside.remark_items)
    })
    self.init()
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
  statTotal() {
    let self = this
    let pack_money = 0
    let total_money = 0
    let reward_money = 0
    self.data.order_list.forEach(item => {
      let menu = self.data.menu_data[item.id]
      let price = 0
      if (item.type == 'vary') {
        price = item.form.price
      } else {
        price = menu.price
        if (item.form.raise) {
          price += item.form.raise
        }
      }
      if (menu.pack_mode == 'every') {
        pack_money += menu.pack.money * item.amount
      } else {
        pack_money += menu.pack.money
      }
      total_money += price * item.amount
      if (item.form.gift) {
        reward_money += price * item.amount
      }
    })
    if (self.data.mode.value == 'delivery') {
      total_money += self.data.delivery_money
    }
    total_money += pack_money
    self.setData({
      pack_money: pack_money,
      total_money: total_money,
      reward_money: reward_money,
      payable_money: total_money - reward_money
    })
  },
  modeChange(e) {
    let self = this
    self.setData({
      'mode.value': e.currentTarget.dataset.key
    })
    self.statTotal()
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.rule]: e.detail.value,
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  inputDigit(e) {
    let self = this
    let value = e.detail.value
    if (value.charAt(value.length - 1) != '.') {
      if (e.currentTarget.dataset.rule) {
        self.setData({
          [e.currentTarget.dataset.rule]: e.detail.value,
          [e.currentTarget.dataset.field]: Number(value)
        })
      } else {
        self.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
      self.statTotal()
    } else {
      if (e.currentTarget.dataset.rule) {
        self.setData({
          [e.currentTarget.dataset.rule]: e.detail.value
        })
      }
    }
  },
  addFee() {
    let self = this
    self.setData({
      delivery_money: self.data.delivery_money+50
    })
    self.statTotal()
  },
  subFee() {
    let self = this
    if (self.data.delivery_money > 0) {
      self.setData({
        delivery_money: self.data.delivery_money-50
      })
    }
    self.statTotal()
  },
  genderChange(e) {
    this.setData({
      'contacts.gender': e.detail.value ? 1 : 2
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
    console.log(e)
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
  tabRemark(e) {
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
  submitForm() {
    let self = this
    let data = {
      mode: self.data.mode.value,
      list: self.data.order_list,
      tableware: self.data.tableware.title,
      remark: self.data.order_remark,
      contacts: self.data.contacts,
      menu_ids: self.data.menu_ids
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
        if (data.mode=='delivery') {
          if (self.data.address == '') {
            self.setData({
              error: '请输入详细地址'
            })
            return
          }
          data.address = self.data.address
          data.time_string = self.data.time_string1
          data.delivery_money = self.data.delivery_money
        } else {
          data.time_string = self.data.time_string2
        }
        wx.showLoading({
          title: '正在提交',
          mask: true
        })
        if (!self.data.hold) {
          self.data.hold = true
          wx.cloud.callFunction({
            name: 'outside_order',
            data: {
              action: 'create_passive',
              data: data
            }
          }).then(res => {
            self.data.hold = false
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                title: '提交成功',
                icon: 'success',
                duration: 2000
              })
              setTimeout(() => {
                wx.navigateTo({
                  url: 'list'
                })
              }, 2000)
              wx.removeStorage({
                key: 'temp_outside'
              })
            } else {
              wx.showToast({
                title: '提交失败',
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
  }
})
