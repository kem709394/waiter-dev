const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../utils/tools.js')

Page({
  data: {
    detail: null,
    form: {
      contacts: {
        name: '',
        mobile: '',
        gender: 1
      },
      content: '',
      location: null
    },
    models: {},
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '姓名称呼是必填项'
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
      name: 'content',
      rules: [{
        required: true,
        message: '详细地址是必填项'
      }]
    }]
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail,
      form: {
        contacts: tools.objCopy(detail.contacts),
        content: detail.content,
        location: tools.objCopy(detail.location)
      },
      models: {
        name: detail.contacts.name,
        mobile: detail.contacts.mobile,
        content: detail.content
      }
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.rule]: e.detail.value,
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  genderChange(e) {
    this.setData({
      'form.contacts.gender': e.detail.value ? 1 : 2
    })
  },
  checkLocation() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(res) {
          if (res.authSetting['scope.userLocation'] == undefined || res.authSetting['scope.userLocation']) {
            resolve()
          } else {
            wx.showModal({
              title: '位置信息权限',
              content: '需要获取您的位置信息才能进行下一步操作',
              success (res) {
                if (res.confirm) {
                  wx.openSetting({
                    success(res) {
                      if (res.authSetting['scope.userLocation']) {
                        resolve()
                      }
                    }
                  })
                }
              }
            })
          }
        }
      })
    })
  },
  chooseLocation() {
    let self = this
    self.checkLocation().then(()=>{
      wx.chooseLocation({
        success(res) {
          self.setData({
            'models.content': res.address,
            'form.content': res.address,
            'form.location': {
              name: res.name,
              coordinate: {
                type: 'Point',
                coordinates: [res.longitude, res.latitude]
              }
            }
          })
        }
      })
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
        let form = self.data.form
        if (form.location == null) {
          self.setData({
            error: '地图定位是必选项'
          })
          return
        }
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        db.collection('address').where({
          _id: self.data.detail._id,
          _openid: '{openid}'
        }).update({
          data: form
        }).then(res=>{
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          })
          setTimeout(function () {
            wx.navigateBack()
          }, 2000)
          app.globalData.update = true
          try {
            app.addressUpdateCallback()
          } catch (e) {}
        })
      }
    })
  }
})