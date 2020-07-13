const app = getApp()
const db = wx.cloud.database()
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    detail: {},
    form: {
      table: [],
      amount: 1,
      date_string: '',
      time_range: [],
      remark: ''
    }
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail,
      'form.table': detail.table,
      'form.amount': detail.amount,
      'form.date_string': detail.date_string,
      'form.time_range': detail.time_range,
      'form.remark': detail.remark
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  inputNumber(e) {
    this.setData({
      [e.currentTarget.dataset.field]: Number(e.detail.value)
    })
  },
  dateChange(e) {
    this.setData({
      'form.date_string': e.detail.value
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
  tableChange(e) {
    this.setData({
      'form.table': e.detail.value
    })
  },
  submitForm() {
    let self = this
    if (self.data.form.table.length == 0) {
      self.setData({
        error: '请选择保留餐桌'
      })
      return
    }
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'book_order',
      data: {
        action: 'modify',
        id: self.data.detail._id,
        data: self.data.form
      }
    }).then(res => {
      if (res.result && res.result.errcode == 0) {
        wx.showToast({
          icon: 'success',
          title: '操作成功',
          duration: 2000
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      } else {
        wx.showToast({
          icon: 'none',
          title: '操作失败',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  }
})