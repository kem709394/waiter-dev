const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    detail: null,
    form: {
      title: '',
      date_string: '',
      visible: true,
      note: '',
      priority: 0,
      content: ''
    },
    models: {},
    rules: [{
      name: 'title',
      rules: [{
        required: true,
        message: '公告标题是必填项'
      }]
    }, {
      name: 'priority',
      rules: [{
        range: [0, 999],
        message: '优先级别的范围0~999'
      }]
    }]
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail,
      'form.title': detail.title,
      'form.date_string': detail.date_string,
      'form.visible': detail.visible,
      'form.note': detail.note,
      'form.priority': detail.priority,
      'form.content': detail.content,
      'models.title': detail.title,
      'models.priority': detail.priority
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
  dateChange(e) {
    this.setData({
      'form.date_string': e.detail.value
    })
  },
  visibleChange(e) {
    this.setData({
      'form.visible': e.detail.value
    })
  },
  editorChange(e) {
    this.setData({
      'form.content': e.detail.html
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
        data.update_sid = app.globalData.identity.staff._id
        data.update_time = db.serverDate()
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        db.collection('notice').doc(self.data.detail._id).update({
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