const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    form: {
      active: false,
      use_distance: 50,
      notify: {
        active: false,
        template: {
          remind: ''
        }
      },
      voucher: {
        active: false,
        printer: []
      }
    }
  },
  onLoad() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('config').doc('queue').get().then(res => {
      wx.hideLoading()
      let content = res.data.content
      self.setData({
        'form.active': content.active,
        'form.use_distance': content.use_distance,
        'form.notify': tools.objCopy(content.notify),
        'form.voucher': tools.objCopy(content.voucher)
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
  submitForm() {
    let self = this
    wx.showLoading({
      title: '正在保存',
      mask: true
    })
    db.collection('config').doc('queue').update({
      data: {
        content: self.data.form,
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