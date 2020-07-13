const app = getApp()
const uuid = require('../../../../utils/uuid.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    value: {
      type: Array,
      value: [],
      observer: '_valueChange'
    },
    limit: {
      type: Number,
      value: 4
    }
  },
  data: {
    list: []
  },
  methods: {
    _valueChange(value) {
      this.setData({
        list: value
      })
    },
    view(e) {
      let self = this
      let index = e.currentTarget.dataset.index
      let list = self.data.list
      wx.previewImage({
        urls: list,
        current: list[index]
      })
    },
    choose(e) {
      let self = this
      let list = self.data.list
      let limit = self.data.limit
      wx.chooseImage({
        count: limit - list.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          res.tempFilePaths.forEach(item => {
            wx.showLoading({
              title: '正在上传',
              mask: true
            })
            let suffix = item.substring(item.lastIndexOf('.'), item.length)
            wx.cloud.uploadFile({
              cloudPath: uuid.v1() + suffix,
              filePath: item,
              success: res => {
                list.push(res.fileID)
                self.setData({
                  list: list
                })
                self.triggerEvent('change', list)
                wx.hideLoading()
              }
            })
          })
        }
      })
    },
    remove(e) {
      let self = this
      let list = self.data.list
      let index = e.currentTarget.dataset.index
      list.splice(index, 1)
      self.setData({
        list: list
      })
      self.triggerEvent('change', list)
    }
  }
})