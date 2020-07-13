const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../utils/tools.js')

Page({
  data: {
    list: [],
    form: {
      contacts: {
        name: '',
        mobile: '',
        gender: 1
      },
      content: '',
      location: null,
      is_default: false
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
  onLoad() {
    this.setData({
      list: app.globalData.temp_list
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
              success(res) {
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
    self.checkLocation().then(() => {
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
        let list = self.data.list
        let data = tools.objCopy(self.data.form)
        if (data.location == null) {
          self.setData({
            error: '地图定位是必选项'
          })
          return
        }
        if (list.length==0) {
          data.is_default = true
        }
        data.owner_uid = app.globalData.identity.uid
        data.create_time = db.serverDate()
        wx.showLoading({
          title: '正在保存',
          mask: true
        })
        db.collection('address').add({
          data: data
        }).then(res=>{
          if (data.is_default) {
            list.forEach(item=>{
              if (item.is_default) {
                db.collection('address').where({
                  _id: item._id,
                  openid: '{openid}',
                }).update({
                  data: {
                    is_default: false,
                    update_time: db.serverDate()
                  }
                })
              }
            })
          }
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