const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../utils/tools.js')
const moment = require('../../../utils/moment.min.js')

Page({
  data: {
    config: {},
    detail: null,
    granted: false,
    order_sn: ''
  },
  onLoad(options) {
    let self = this
    if (app.globalData.config) {
      self.setData({
        config: app.globalData.config
      })
    } else {
      app.configReadyCallback = () => {
        self.setData({
          config: app.globalData.config
        })
      }
    }
    if (app.globalData.identity) {
      self.setData({
        granted: true
      })
    } else {
      app.identityReadyCallback = () => {
        self.setData({
          granted: true
        })
      }
      app.authorize()
    }
    if (options.scene) {
      self.data.order_sn = options.scene
      self.search()
    } else {
      self.scanCode()
    }
  },
  scanCode() {
    let self = this
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success(res) {
        self.data.order_sn = res.result
        self.search()
      }
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
  search() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'outside_order',
      data: {
        action: 'detail',
        sn: self.data.order_sn
      }
    }).then(res=>{
      if (res.result.errcode ==0) {
        if (res.result.data) {
          let detail = res.result.data
          detail.create_time = moment(detail.create_time).format('YYYY-MM-DD HH:mm')
          self.setData({
            detail: detail
          })
          wx.hideLoading()
        } else {
          wx.showToast({
            icon: 'none',
            title: '找不到订单',
            duration: 2000
          })
        }
      } else {
        wx.showToast({
          icon: 'none',
          title: '找不到订单',
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
  receive() {
    let self = this
    let detail = self.data.detail
    wx.showLoading({
      title: '正在领取',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'outside_order',
      data: {
        action: 'collect',
        id: detail._id
      }
    }).then(res => {
      if (res.result) {
        if (res.result.errcode == 0) {
          wx.showToast({
            icon: 'success',
            title: '领取成功！',
            duration: 2000
          })
          setTimeout(() => {
            wx.redirectTo({
              url: 'detail?id=' + detail._id
            })
          }, 2000)
        } else {
          wx.showToast({
            icon: 'none',
            title: res.result.errmsg,
            duration: 2000
          })
        }
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
  }
})