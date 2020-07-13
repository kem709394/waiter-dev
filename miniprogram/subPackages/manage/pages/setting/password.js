const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    config: {},
    form: {
      system: '',
      refund: ''
    },
    models: {},
    rules: [{
      name: 'system',
      rules: [{
        required: true,
        message: '后台密码是必填项'
      }]
    }, {
      name: 'refund',
      rules: [{
        required: true,
        message: '退款密码是必填项'
      }]
    }]
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
    db.collection('config').doc('password').get().then(res => {
      wx.hideLoading()
      let content = res.data.content
      self.setData({
        'form.system': content.system,
        'form.refund': content.refund,
        'models.system': content.system,
        'models.refund': content.refund
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
          title: '正在保存',
          mask: true
        })
        db.collection('config').doc('password').update({
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
  }
})