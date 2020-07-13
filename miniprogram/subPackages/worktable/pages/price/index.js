const app = getApp()
const db = wx.cloud.database()
const wxqrcode = require('../../../../utils/wxqrcode.js')

Page({
  data: {
    form: {
      price: 0,
      model: ''
    },
    rules: [{
      name: 'price',
      rules: [{
        required: true,
        message: '菜品价格是必填项'
      }]
    }, {
      name: 'model',
      rules: [{
        required: true,
        message: '菜品规格是必填项'
      }]
    }],
    qrcode: {
      ready: false,
      value: '',
      price: 0
    }
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
          title: '正在加载',
          mask: true
        })
        let form = self.data.form
        db.collection('vary_price').add({
          data: {
            price: parseInt(form.price * 100),
            model: form.model,
            create_sid: app.globalData.identity.staff._id,
            create_time: db.serverDate()
          }
        }).then(res=>{
          let data = wxqrcode.createQrCodeImg(res._id, { size: 300 })
          self.setData({
            'qrcode.price': form.price,
            'qrcode.ready': true,
            'qrcode.data': data
          })
          wx.hideLoading()
        })
      }
    })
  }
})