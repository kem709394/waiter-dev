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
      type: 'combo',
      column: {
        inside: [],
        outside: [],
      },
      intro: '',
      price: 0,
      price2: 0,
      statistics: {
        sales: 0
      },
      pack: {
        mode: 'every',
        money: 0
      },
      combo: [],
      scope: [],
      note: '',
      visible: false,
      priority: 0,
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
    }, {
      name: 'priority',
      rules: [{
        range: [0, 999],
        message: '优先级别的范围0~999'
      }]
    }],
    column: [],
    combo: {
      index: null,
      dialog: false,
      form: {
        name: '',
        list: [],
        amount: 1
      },
      rules: [{
        name: 'name',
        rules: [{
          required: true,
          message: '选项名称是必填项'
        }]
      },{
        name: 'list',
        rules: [{
          required: true,
          message: '可选菜品是必选项'
        }]
      }, {
        name: 'priority',
        rules: [{
          range: [1, 99],
          message: '可选数量的范围1~99'
        }]
      }],
      itemButtons: [{
        text: '编辑'
      }, {
        text: '删除',
        type: 'warn'
      }],
      formButtoms: [{
        text: '取消'
      }, {
        text: '确认'
      }]
    },
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
    menu: {
      dialog: false,
      options: []
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
    self.setData({
      column: column,
      config: app.globalData.config
    })
    self.loadMenu()
  },
  loadMenu() {
    let self = this
    db.collection('menu')
      .aggregate()
      .match({
        is_deleted: false,
        type: 'single'
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res => {
        self.setData({
          'menu.options': res.list.map(item => {
            return {
              value: item._id,
              name: item.name,
              alias: item.alias
            }
          })
        })
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
  addCombo() {
    this.setData({
      'combo.form.name': '',
      'combo.form.list': [],
      'combo.form.amount': 1,
      'combo.index': null,
      'combo.dialog': true
    })
  },
  tapCombo(e) {
    let self = this
    if (e.detail.index) {
      let combo = self.data.form.combo
      combo.splice(e.currentTarget.dataset.index, 1)
      self.setData({
        'form.combo': combo
      })
    } else {
      let index = e.currentTarget.dataset.index
      let item = self.data.form.combo[index]
      self.setData({
        'combo.form.name': item.name,
        'combo.form.list': item.list,
        'combo.form.amount': item.amount,
        'combo.index': index,
        'combo.dialog': true
      })
    }
  },
  tapComboForm(e) {
    let self = this
    if (e.detail.index) {
      self.selectComponent('#comboForm').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          let form = self.data.combo.form
          if (form.list.length>0) {
            let combo = self.data.form.combo
            if (self.data.combo.index == null) {
              combo.push({
                name: form.name,
                list: form.list,
                amount: form.amount
              })
            } else {
              let index = self.data.combo.index
              combo[index].name = form.name
              combo[index].list = form.list
              combo[index].amount = form.amount
            }
            self.setData({
              'form.combo': combo,
              'combo.dialog': false
            })
          } else {
            self.setData({
              error: '可选菜品的数量不能为0'
            })
          }
        }
      })
    } else {
      self.setData({
        'combo.dialog': false
      })
    }
  },
  chooseMenu(e) {
    this.setData({
      'menu.dialog': true
    })
  },
  affirmMenu(e) {
    this.setData({
      'combo.form.list': e.detail.value
    })
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
        if (data.combo.length == 0) {
          self.setData({
            error: '请设置菜品选项'
          })
          return
        }
        data.price = parseInt(data.price * 100)
        data.price2 = parseInt(data.price2 * 100)
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