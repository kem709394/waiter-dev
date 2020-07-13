const app = getApp()
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    config: null,
    form: {
      table: [],
      contacts: {
        name: '',
        gender: 1,
        mobile: ''
      },
      amount: 0,
      date_string: '',
      time_range: [],
      remark: ''
    },
    time: '',
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
    }, {
      name: 'amount',
      rules: [{
        required: true,
        message: '使用人数是必填项'
      }, {
        range: [1, 100],
        message: '使用人数范围为1和100之间'
      }]
    }],
    print: true
  },
  onLoad() {
    let self = this
    let time = moment().format('HH:mm')
    self.setData({
      time: time,
      config: app.globalData.config,
      'form.time_range': [time, time],
      'form.date_string': app.globalData.temp_data.date,
      'form.table': app.globalData.temp_data.table
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
  switchChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  genderChange(e) {
    this.setData({
      'form.contacts.gender': e.detail.value ? 1 : 2
    })
  },
  time0Change(e) {
    let value = e.detail.value
    this.setData({
      'form.time_range[0]': value,
      'form.time_range[1]': value
    })
  },
  time1Change(e) {
    this.setData({
      'form.time_range[1]': e.detail.value
    })
  },
  submitForm() {
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
        wx.showLoading({
          title: '正在提交',
          mask: true
        })
        if (!self.data.hold) {
          self.data.hold = true
          wx.cloud.callFunction({
            name: 'book_order',
            data: {
              action: 'create_passive',
              data: self.data.form,
              print: self.data.print
            }
          }).then(res => {
            self.data.hold = false
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                icon: 'success',
                title: '提交成功',
                duration: 2000
              })
              setTimeout(() => {
                wx.navigateBack()
              }, 2000)
              app.globalData.update = true
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