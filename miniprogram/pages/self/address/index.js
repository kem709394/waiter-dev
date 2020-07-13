const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../utils/tools.js')

Page({
  data: {
    config: {},
    list: [],
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }]
  },
  onLoad() {
    this.init()
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (app.globalData.update) {
        self.init()
        app.globalData.update = false
      }
    } else {
      self.data.back = true
    }
  },
  init() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('address').where({
      _openid: '{openid}'
    }).get().then(res=>{
      wx.hideLoading()
      self.setData({
        list: res.data
      })
      app.globalData.temp_list = res.data
    })
  },
  setDefault(e) {
    let self = this
    let list = self.data.list
    let index = e.currentTarget.dataset.index
    let address = list[index]
    if (!address.is_default) {
      wx.showLoading({
        title: '正在更新',
        mask: true
      })
      db.collection('address').where({
        _openid: '{openid}'
      }).update({
        data: {
          is_default: false,
          update_time: db.serverDate()
        }
      }).then(res=>{
        db.collection('address').where({
          _id: address._id,
          _openid: '{openid}'
        }).update({
          data: {
            is_default: true,
            update_time: db.serverDate()
          }
        }).then(res=>{
          list.forEach(item=>{
            if (item._id == address._id) {
              item.is_default = true
            } else {
              item.is_default = false
            }
          })
          self.setData({
            list: list
          })
          wx.showToast({
            title: '设置成功',
            icon: 'success',
            duration: 2000
          })
        })
      })
    }
  },
  tapSlide(e) {
    let self = this
    if (e.detail.index) {
      self.remove(e.currentTarget.dataset.index)
    } else {
      let item = self.data.list[e.currentTarget.dataset.index]
      app.globalData.temp_data = tools.objCopy(item)
      wx.navigateTo({
        url: 'update'
      })
    }
  },
  detail(e) {
    let self = this
    let item = self.data.list[e.currentTarget.dataset.index]
    app.globalData.temp_data = tools.objCopy(item)
    wx.navigateTo({
      url: 'detail'
    })
  },
  create() {
    wx.navigateTo({
      url: 'create',
    })
  },
  remove(index) {
    let self = this
    let item = self.data.list[index]
    wx.showModal({
      title: '操作提示',
      content: '确定要删除当前地址？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          db.collection('address').where({
            _id: item._id,
            _openid: '{openid}'
          }).remove().then(res=>{
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 2000
            })
            setTimeout(() => {
              self.init()
            }, 2000)
          }).catch(err=>{
            wx.showToast({
              title: '系统繁忙',
              icon: 'none',
              duration: 2000
            })
          })
        }
      }
    })
  }
})