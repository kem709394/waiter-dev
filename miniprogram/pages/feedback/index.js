const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    form: {
      note: '',
      mobile: ''
    },
    models: {},
    rules: [{
      name: 'note',
      rules: [{
        required: true,
        message: '反馈内容是必填项'
      }, {
        minlength: 5,
        message: '反馈内容至少5个字'
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
    }]
  },
  onLoad() {
    let self = this
    if (app.globalData.identity && app.globalData.identity.mobile){
      self.setData({
        'form.mobile': app.globalData.identity.mobile,
        'models.mobile': app.globalData.identity.mobile
      })
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
  inputMobile(e) {
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
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        let data = self.data.form
        data.create_uid = app.globalData.identity.uid
        data.create_time = db.serverDate()
        db.collection('feedback').add({
          data: data
        }).then(res=>{
          wx.showToast({
            title: '提交成功',
            icon: 'success',
            duration: 2000
          })
          setTimeout(function () {
            wx.navigateBack()
          }, 2000)
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