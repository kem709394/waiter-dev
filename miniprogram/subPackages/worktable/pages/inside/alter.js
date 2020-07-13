const app = getApp()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    config: {},
    detail: {},
    menu_ids: [],
    menu_data: {},
    menu_list: [],
    add_menu_list: [],
    seat_count: 0,
    table: '',
    time_string: '',
    order_remark: '',
    remark: {
      type: '',
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
    vary: {
      type: '',
      index: null,
      current: null,
      dialog: false,
      form: {
        price: 0,
        model: ''
      },
      buttons: [{
        text: '删除'
      },{
        text: '更新'
      }]
    }
  },
  onLoad(options) {
    let self = this
    let config = app.globalData.config
    self.setData({
      config: config,
      'remark.keyword': tools.toArray(config.inside.remark_items)
    })
    app.globalData.rt_data.inside_order.forEach(item => {
      if (item._id == options.id) {
        let order = tools.objCopy(item)
        if (order.table) {
          self.setData({
            detail: order,
            table: order.table,
            menu_list: order.menu_list,
            seat_count: order.seat_count,
            order_remark: order.remark
          })
        } else {
          self.setData({
            detail: order,
            menu_list: order.menu_list,
            seat_count: order.seat_count,
            order_remark: order.remark,
            time_string: order.time_string
          })
        }
      }
    })
  },
  onShow() {
    let self = this
    if (self.data.back) {
      let temp = app.globalData.rt_data.temp_inside_data
      if (temp.length>0) {
        self.setData({
          menu_data: app.globalData.rt_data.menu_data,
          add_menu_list: self.data.add_menu_list.concat(temp)
        })
        app.globalData.rt_data.temp_inside_data = []
      }
    } else {
      app.globalData.rt_data.temp_inside_data = []
      self.data.back = true
    }
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
  tableChange(e) {
    this.setData({
      table: e.detail.value
    })
  },
  timeChange(e) {
    this.setData({
      time_string: e.detail.value
    })
  },
  showVary(e) {
    let self = this
    let type = e.currentTarget.dataset.type
    let index = e.currentTarget.dataset.index
    let form = self.data.vary.form
    let current = null
    if (type=='1') {
      current = self.data.menu_list[index]
      form.price = current.price/100
      form.model = current.model
    } else {
      current = self.data.add_menu_list[index]
      form.price = current.form.price / 100
      form.model = current.form.model
    }
    self.setData({
      'vary.type': type,
      'vary.index': index,
      'vary.current': current,
      'vary.form': form,
      'vary.dialog': true
    })
  },
  tapVary(e) { 
    let self = this
    if (e.detail.index) {
      let form = self.data.vary.form
      if (form.price < 0) {
        self.setData({
          error: '菜品价格不能小于0'
        })
        return
      }
      if (form.model == '') {
        self.setData({
          error: '请输入菜品规格'
        })
        return
      }
      if (self.data.vary.type=='1') {
        let list = self.data.menu_list
        let current = list[self.data.vary.index]
        current.price = parseInt(form.price * 100)
        current.model = form.model
        self.setData({
          menu_list: list,
          'vary.dialog': false
        })
      } else {
        let list = self.data.add_menu_list
        let current = list[self.data.vary.index]
        current.form.price = parseInt(form.price * 100)
        current.form.model = form.model
        self.setData({
          add_menu_list: list,
          'vary.dialog': false
        })
      }
    } else {
      if (self.data.vary.type == '1') {
        let list = self.data.menu_list
        list.splice(self.data.vary.index,1)
        self.setData({
          menu_list: list,
          'vary.dialog': false
        })
      } else {
        let list = self.data.add_menu_list
        list.splice(self.data.vary.index, 1)
        self.setData({
          add_menu_list: list,
          'vary.dialog': false
        })
      }
    }
  },
  addAmount(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    let list = self.data.menu_list
    let item = list[index]
    item.amount++
    self.setData({
      menu_list: list
    })
  },
  addAmount2(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    let list = self.data.add_menu_list
    let item = list[index]
    item.amount++
    self.setData({
      add_menu_list: list
    })
  },
  subAmount(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    let list = self.data.menu_list
    let item = list[index]
    item.amount--
    if (item.amount == 0) {
      list.splice(index, 1)
    }
    self.setData({
      menu_list: list
    })
  },
  subAmount2(e) {
    let self = this
    let index = e.currentTarget.dataset.index
    let list = self.data.add_menu_list
    let item = list[index]
    item.amount--
    if (item.amount == 0) {
      list.splice(index, 1)
    }
    self.setData({
      add_menu_list: list
    })
  },
  addMenu() {
    app.globalData.rt_data.temp_inside_data = []
    wx.navigateTo({
      url: 'add'
    })
  },
  addSeat() {
    let self = this
    self.setData({
      seat_count: ++self.data.seat_count
    })
  },
  subSeat() {
    let self = this
    if (self.data.seat_count > 0) {
      self.setData({
        seat_count: --self.data.seat_count
      })
    }
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
      let type = e.currentTarget.dataset.type
      if (type=='1') {
        let item = self.data.menu_list[index]
        self.setData({
          'remark.dialog': true,
          'remark.type': '1',
          'remark.index': index,
          'remark.content': item.remark ? item.remark : ''
        })
      } else {
        let item = self.data.add_menu_list[index]
        self.setData({
          'remark.dialog': true,
          'remark.type': '2',
          'remark.index': index,
          'remark.content': item.remark ? item.remark : ''
        })
      }
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
        if (self.data.remark.type=='1') {
          let list = self.data.menu_list
          let item = list[self.data.remark.index]
          item.remark = self.data.remark.content
          self.setData({
            'remark.dialog': false,
            menu_list: list
          })
        } else {
          let list = self.data.add_menu_list
          let item = list[self.data.remark.index]
          item.remark = self.data.remark.content
          self.setData({
            'remark.dialog': false,
            add_menu_list: list
          })
        }
      }
    }
  },
  submitForm() {
    let self = this
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    let menu_ids = []
    let menu_list = self.data.menu_list
    let add_menu_list = self.data.add_menu_list
    menu_list.forEach(item=>{
      menu_ids.push(item.id)
    })
    add_menu_list.forEach(item=>{
      menu_ids.push(item.id)
    })
    let data = {
      menu_ids: menu_ids,
      menu_list: menu_list,
      add_menu_list: add_menu_list,
      seat_count: self.data.seat_count,
      remark: self.data.order_remark
    }
    if (self.data.detail.table) {
      data.table = self.data.table
    } else {
      data.time_string = self.data.time_string
    }
    wx.cloud.callFunction({
      name: 'inside_order',
      data: {
        action: 'modify',
        id: self.data.detail._id,
        data: data
      }
    }).then(res => {
      console.log(res)
      if (res.result) {
        if (res.result.errcode == 0) {
          wx.showToast({
            icon: 'success',
            title: '提交成功',
            duration: 2000
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        } else {
          wx.showToast({
            icon: 'none',
            title: res.result.errmsg,
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
})