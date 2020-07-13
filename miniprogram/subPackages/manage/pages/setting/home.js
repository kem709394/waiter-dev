const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    config: {},
    form: {
      notice: '',
      swiper: [],
      summary: {
        active: false,
        content: ''
      }
    },
    models: {},
    rules: [],
    flag: false
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
    db.collection('config').doc('home').get().then(res => {
      wx.hideLoading()
      let content = res.data.content
      self.setData({
        'form.notice': tools.objCopy(content.notice),
        'form.swiper': tools.objCopy(content.swiper),
        'form.summary': tools.objCopy(content.summary)
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
  editorChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.html
    })
  },
  submitForm(e) {
    let self = this
    self.setData({
      flag: true
    })
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
        db.collection('config').doc('home').update({
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