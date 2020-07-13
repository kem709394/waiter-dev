const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    stateOptions: ['停用', '可用'],
    qrcode: {
      dialog: false,
      buttons: [{
        text: '关闭'
      }, {
        text: '导出'
      }],
      url: '',
      wxml: '<view class="container"><text class="title">@title@</text><image class="image" src="@url@"></image></view>',
      style: {
        container: {
          width: 300,
          height: 400,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
          alignItems: 'center'
        },
        title: {
          width: 300,
          height: 100,
          fontSize: 20,
          textAlign: 'center'
        },
        image: {
          width: 200,
          height: 200,
          justifyContent: 'center'
        }
      }
    }
  },
  onLoad(options) {
    let self = this
    self.setData({
      detail: app.globalData.temp_data
    })
  },
  showQrcode() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'system',
      data: {
        action: 'getWxacode2',
        data: {
          scene: self.data.detail.scene,
          page: 'pages/order/inside/index'
        }
      }
    }).then(res => {
      console.log(res)
      if (res.result && res.result.errcode == 0) {
        self.setData({
          'qrcode.url': res.result.url,
          'qrcode.dialog': true
        })
        wx.hideLoading()
      } else {
        wx.showToast({
          title: '系统繁忙',
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
  },
  tapQrcode(e) {
    let self = this
    if (e.detail.index == 1) {
      self.extraImage()
    }
    self.setData({
      'qrcode.dialog': false
    })
  },
  extraImage() {
    let self = this
    wx.showLoading({
      title: '正在导出',
      mask: true
    })
    let wxml = self.data.qrcode.wxml
    let style = self.data.qrcode.style
    wxml = wxml.replace('@title@', self.data.detail.name)
    wxml = wxml.replace('@url@', self.data.qrcode.url)
    let widget = self.selectComponent('.widget')
    widget.renderToCanvas({
      wxml,
      style
    }).then((res) => {
      wx.hideLoading()
      widget.canvasToTempFilePath().then(res => {
        let filePath = res.tempFilePath
        wx.getSetting({
          success(res) {
            if (res.authSetting['scope.writePhotosAlbum']) {
              wx.saveImageToPhotosAlbum({
                filePath: filePath,
                success(res) {
                  wx.showToast({
                    title: '保存成功',
                    icon: 'success',
                    duration: 2000
                  })
                }
              })
            } else {
              wx.authorize({
                scope: 'scope.writePhotosAlbum',
                success() {
                  wx.saveImageToPhotosAlbum({
                    filePath: filePath,
                    success(res) {
                      wx.showToast({
                        title: '保存成功',
                        icon: 'success',
                        duration: 2000
                      })
                    }
                  })
                }
              })
            }
          }
        })
      })
    })
  }
})