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
    menu_ids: [],
    menu_data: {},
    order_list: [],
    seat_count: 0,
    seat_price: 0,
    pack_money: 0,
    total_money: 0,
    reward_money: 0,
    payable_money: 0,
    order_remark: '',
    time_string: '',
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
    table: {
      name: '',
      options: []
    },
    mode: {
      value: '',
      options: []
    },
    remark: {
      index: null,
      dialog: false,
      content: '',
      keyword: ['t1', 't2'],
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
    self.setData({
      config: config,
      seat_count: config.inside.seat.count,
      seat_price: config.inside.seat.price
    })
    let options = []
    if (config.inside.arrival.active) {
      options.push({
        value: 'arrival',
        name: '到店点餐'
      })
    }
    if (config.inside.reserve.active) {
      options.push({
        value: 'reserve',
        name: '预定点餐'
      })
    }
    self.setData({
      'mode.value': options[0].value,
      'mode.options': options,
      'table.options': app.globalData.table.map(item => {
        return item.name
      }),
      'remark.keyword': tools.toArray(config.inside.remark_items)
    })
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
  modeChange(e) {
    this.setData({
      'mode.value': e.currentTarget.dataset.key
    })
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
      if (item.form.pack) {
        if (menu.pack.mode == 'every') {
          pack_money += menu.pack.money * item.amount
        } else {
          pack_money += menu.pack.money
        }
      }
      total_money += price * item.amount
      if (item.form.gift) {
        reward_money += price * item.amount
      }
    })
    total_money += pack_money
    total_money += self.data.seat_price * self.data.seat_count
    self.setData({
      pack_money: pack_money,
      total_money: total_money,
      reward_money: reward_money,
      payable_money: total_money - reward_money
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
  tableChange(e) {
    let self = this
    self.setData({
      'table.name': self.data.table.options[e.detail.value]
    })
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
  submitForm() {
    let self = this
    let data = {
      mode: self.data.mode.value,
      list: self.data.order_list,
      remark: self.data.order_remark,
      seat_count: self.data.seat_count,
      menu_ids: self.data.menu_ids
    }
    if (data.mode == 'arrival') {
      if (self.data.table.name == '') {
        self.setData({
          error: '请选择餐桌'
        })
        return
      }
      data.table = self.data.table.name
      self.submit(data)
    } else if (data.mode == 'reserve') {
      self.selectComponent('#form').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          data.time_string = self.data.time_string
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
        name: 'inside_order',
        data: {
          action: 'create_passive',
          data: data
        }
      }).then(res => {
        self.data.hold = false
        if (res.result) {
          if (res.result.errcode == 0) {
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
              key: 'temp_inside'
            })
          } else {
            wx.showToast({
              title: res.result.errmsg,
              icon: 'none',
              duration: 2000
            })
          }
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