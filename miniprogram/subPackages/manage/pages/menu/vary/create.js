const app = getApp()
const db = wx.cloud.database()
const uuid = require('../../../../../utils/uuid.js')

Page({
  data: {
    config: null,
    form: {
      cover: '/images/cover.png',
      name: '',
      alias: '',
      type: 'vary',
      column: {
        inside: [],
        outside: [],
      },
      intro: '',
      price_note: '',
      statistics: {
        sales: 0
      },
      pack: {
        mode: 'every',
        money: 0
      },
      option: {
        active: false,
        list: []
      },
      scope: [],
      note: '',
      visible: false,
      priority: 0,
      kitchen: '',
      sku: {
        active: false,
        count: 0,
        total: 0
      }
    },
    models: {},
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '菜品名称是必填项'
      }]
    },{
      name: 'price_note',
      rules: [{
        required: true,
        message: '价格说明是必填项'
      }]
    }, {
      name: 'priority',
      rules: [{
        range: [0, 999],
        message: '优先级别的范围0~999'
      }]
    }],
    column: [],
    pack: {
      index: 0,
      options: [{
        value: 'every',
        name: '每份加收'
      }, {
        value: 'unlimit',
        name: '不限数量'
      }]
    },
    kitchen: {
      index: 0,
      options: [{
        name: '未指定厨房',
        value: ''
      }]
    }
  },
  onLoad() {
    let self = this
    let column = app.globalData.rt_data.column.map(item => {
      return {
        name: item.name,
        value: item._id,
        scope: item.scope
      }
    })
    let kitchen_options = self.data.kitchen.options
    app.globalData.rt_data.kitchen.forEach(item => {
      kitchen_options.push({
        name: item.name,
        value: item._id
      })
    })
    self.setData({
      column: column,
      config: app.globalData.config,
      'kitchen.options': kitchen_options
    })
  },
  inputChange(e) {
    let self = this
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: e.detail.value,
        [e.currentTarget.dataset.field]: e.detail.value
      })
    } else {
      self.setData({
        [e.currentTarget.dataset.field]: e.detail.value
      })
    }
  },
  inputNumber(e) {
    let self = this
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: e.detail.value,
        [e.currentTarget.dataset.field]: Number(e.detail.value)
      })
    } else {
      self.setData({
        [e.currentTarget.dataset.field]: Number(e.detail.value)
      })
    }
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
    } else {
      if (e.currentTarget.dataset.rule) {
        self.setData({
          [e.currentTarget.dataset.rule]: e.detail.value
        })
      }
    }
  },
  focusTextarea(e) {
    this.setData({
      [e.currentTarget.dataset.focus]: true
    })
  },
  blurTextarea(e) {
    this.setData({
      [e.currentTarget.dataset.focus]: false
    })
  },
  optionChange(e) {
    this.setData({
      'form.option.active': e.detail.active,
      'form.option.list': e.detail.list
    })
  },
  switchChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  scopeChange(e) {
    this.setData({
      'form.scope': e.detail.value
    })
  },
  coverChange() {
    let self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        let temp = res.tempFilePaths[0]
        wx.showLoading({
          title: '正在上传',
          mask: true
        })
        let suffix = temp.substring(temp.lastIndexOf('.'), temp.length)
        wx.cloud.uploadFile({
          cloudPath: uuid.v1() + suffix,
          filePath: temp,
          success: res => {
            self.setData({
              'form.cover': res.fileID
            })
            wx.hideLoading()
          }
        })
      }
    })
  },
  packChange(e) {
    let self = this
    self.setData({
      'pack.index': e.detail.value,
      'form.pack.mode': self.data.pack.options[e.detail.value].value
    })
  },
  kitchenChange(e) {
    let self = this
    self.setData({
      'kitchen.index': e.detail.value,
      'form.kitchen': self.data.kitchen.options[e.detail.value].value
    })
  },
  columnChange(e) {
    let self = this
    if (e.detail.scope == 'inside') {
      self.setData({
        'form.column.inside': e.detail.value
      })
    } else {
      self.setData({
        'form.column.outside': e.detail.value
      })
    }
  },
  submitForm(e) {
    let self = this
    self.selectComponent('#form').validate((valid, errors) => {
      if (!valid) {
        const firstError = Object.keys(errors)
        if (firstError.length) {
          self.setData({
            error: errors[firstError[0]].message
          })
        }
      } else {
        let data = self.data.form
        data.pack.money = parseInt(data.pack.money * 100)
        data.is_deleted = false
        data.create_sid = app.globalData.identity.staff._id
        data.create_time = db.serverDate()
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        db.collection('menu').add({
          data: data
        }).then(res=>{
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          })
          setTimeout(function() {
            wx.navigateBack()
          }, 2000)
          app.globalData.update = true
        }).catch(err=>{
          wx.showToast({
            title: '系统繁忙',
            icon: 'none',
            duration: 2000
          })
        })
      }
    })
  }
})