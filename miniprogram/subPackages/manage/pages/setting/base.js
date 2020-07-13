const app = getApp()
const db = wx.cloud.database()
const uuid = require('../../../../utils/uuid.js')
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    curTab: '0',
    form: {
      active: true,
      avatar: '',
      name: '',
      intro: '',
      clause: '',
      album: [],
      telephone: '',
      location: null,
      address: '',
      business_time: '',
      style: {
        theme: ''
      },
      notify: {
        active: false,
        template: {
          order: '',
          invoke: ''
        }
      }
    }
  },
  onLoad() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('config').doc('base').get().then(res => {
      wx.hideLoading()
      let content = res.data.content
      self.setData({
        'form.active': content.active,
        'form.avatar': content.avatar,
        'form.name': content.name,
        'form.intro': content.intro,
        'form.clause': content.clause,
        'form.album': tools.objCopy(content.album),
        'form.business_time': content.business_time,
        'form.telephone': content.telephone,
        'form.location': tools.objCopy(content.location),
        'form.address': content.address,
        'form.notify': tools.objCopy(content.notify),
        'form.style': tools.objCopy(content.style)
      })
    })
  },
  tabChange(e) {
    this.setData({
      curTab: e.currentTarget.dataset.key
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
  editorChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.html
    })
  },
  avatarChange() {
    let self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        let temp = res.tempFilePaths[0]
        wx.showLoading({
          title: '正在上传',
          mask: true
        })
        let suffix = temp.substring(temp.lastIndexOf('.'), temp.length)
        wx.cloud.uploadFile({
          cloudPath: uuid.v1() + suffix,
          filePath: temp,
          success: res => {
            self.setData({
              'form.avatar': res.fileID
            })
            wx.hideLoading()
          }
        })
      }
    })
  },
  albumChange(e) {
    this.setData({
      'form.album': e.detail
    })
  },
  chooseLocation(e) {
    let self = this
    wx.authorize({
      scope: 'scope.userLocation',
      success() {
        wx.chooseLocation({
          success(res) {
            self.setData({
              'form.address': res.address,
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
      }
    })
  },
  submitForm() {
    let self = this
    wx.showLoading({
      title: '正在保存',
      mask: true
    })
    db.collection('config').doc('base').update({
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