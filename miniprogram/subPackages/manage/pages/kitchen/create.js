const app = getApp()
const db = wx.cloud.database()
const uuid = require('../../../../utils/uuid.js')

Page({
  data: {
    form: {
      cover: '/images/cover.png',
      name: '',
      printer: '',
      note: '',
      priority: 0
    },
    models: {},
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '厨房名称是必填项'
      }]
    }, {
      name: 'printer',
      rules: [{
        required: true,
        message: '打印设备是必选项'
      }]
    }, {
      name: 'priority',
      rules: [{
        range: [0, 999],
        message: '优先级别的范围0~999'
      }]
    }],
    printer: {
      index: -1,
      options: []
    }
  },
  onLoad() {
    let self = this
    let options = []
    app.globalData.rt_data.printer.forEach((item) => {
      options.push({
        value: item._id,
        name: item.name
      })
    })
    self.setData({
      'printer.options': options
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
    let value = e.detail.value
    if (/^[0-9]*$/.test(value)) {
      self.setData({
        [e.currentTarget.dataset.field]: Number(value)
      })
    }
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: value
      })
    }
  },
  printerChange(e) {
    let self = this
    self.setData({
      'printer.index': e.detail.value,
      'form.printer': self.data.printer.options[e.detail.value].value,
      'models.printer': self.data.printer.options[e.detail.value].value
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
        data.is_deleted = false
        data.create_sid = app.globalData.identity.staff._id
        data.create_time = db.serverDate()
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        db.collection('kitchen').add({
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