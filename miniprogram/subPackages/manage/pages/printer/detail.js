const app = getApp()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    privilege: [],
    detail: null,
    provider: {
      index: 0,
      options: [{
        value: 'yly',
        name: '易联云'
      }]
    },
    modelOptions: [
      [{
        value: 'K4',
        name: 'Eprt K4'
      }, {
        value: 'K5',
        name: 'Eprt K5'
      }, {
        value: 'K6',
        name: 'Eprt K6'
      }, {
        value: 'W1',
        name: 'Eprt W1'
      }, {
        value: 'M1',
        name: 'Eprt M1'
      }]
    ],
    setting: {
      hint: '',
      voice: 0
    }
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      privilege: app.globalData.identity.staff.privilege,
      detail: detail,
      'provider.index': tools.findIndex(self.data.provider.options, 'value', detail.provider),
      'setting.hint': detail.hint,
      'setting.voice': detail.voice
    })
  },
  print() {
    let self = this
    wx.showLoading({
      title: '打印中',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'printer',
      data: {
        action: 'print',
        id: self.data.detail._id,
        data: {
          originId: 'test',
          content: '<FS2>打印测试</FS2><audio>打印测试</audio>'
        }
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result) {
        if (res.result.error == '0') {
          wx.showToast({
            title: '操作成功',
            icon: 'success',
            duration: 2000
          })
        } else {
          wx.showToast({
            title: '操作异常',
            icon: 'none',
            duration: 2000
          })
        }
      }
    }).catch(console.error)
  },
  hintChange(e) {
    let self = this
    self.setData({
      'setting.hint': e.detail.value
    })
    self.setSound()
  },
  voiceChange(e) {
    let self = this
    self.setData({
      'setting.voice': parseInt(e.currentTarget.dataset.value)
    })
    self.setSound()
  },
  setSound() {
    let self = this
    wx.showLoading({
      title: '正在设置',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'printer',
      data: {
        action: 'setsound',
        id: self.data.detail._id,
        data: {
          type: self.data.setting.hint,
          voice: self.data.setting.voice
        }
      }
    }).then(res => {
      if (res.result && res.result.error == '0') {
        wx.showToast({
          title: '设置成功',
          icon: 'success',
          duration: 2000
        })
        wx.cloud.callFunction({
          name: 'printer',
          data: {
            action: 'update',
            id: self.data.detail._id,
            data: {
              hint: self.data.setting.hint,
              voice: self.data.setting.voice
            }
          }
        })
      } else {
        wx.showToast({
          title: '设置失败',
          icon: 'none',
          duration: 2000
        })
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  }
})