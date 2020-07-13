const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    config: null,
    form: {
      active: false,
      max_day: 1,
      earnest_money: 0,
      swiper: [],
      notify: {
        active: false,
        template: {
          success: '',
          cancel: '',
          refund: ''
        }
      },
      voucher: {
        active: false,
        printer: []
      },
      warn_text: ''
    }
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config
    })
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('config').doc('book').get().then(res => {
      let content = res.data.content
      let deduct = tools.objCopy(content.deduct)
      deduct.money = deduct.money / 100
      self.setData({
        'form.active': content.active,
        'form.max_day': content.max_day,
        'form.earnest_money': content.earnest_money / 100,
        'form.swiper': tools.objCopy(content.swiper),
        'form.notify': tools.objCopy(content.notify),
        'form.voucher': tools.objCopy(content.voucher),
        'form.warn_text': content.warn_text
      })
      wx.hideLoading()
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
  switchChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  albumChange(e) {
    this.setData({
      'form.swiper': e.detail
    })
  },
  voucherChange(e) {
    this.setData({
      'form.voucher': e.detail
    })
  },
  submitForm() {
    let self = this
    let form = self.data.form
    form.earnest_money = parseInt(form.earnest_money * 100)
    wx.showLoading({
      title: '正在保存',
      mask: true
    })
    db.collection('config').doc('book').update({
      data: {
        content: form,
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res=>{
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      })
    }).catch(err=>{
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  }
})