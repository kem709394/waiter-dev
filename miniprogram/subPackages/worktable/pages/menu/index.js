const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    ready: false,
    timer: null,
    watcher: null,
    data: {
      list: [],
      show: []
    },
    search: {
      temp: '',
      value: ''
    },
    current: null,
    dialog: false,
    form: {
      sku: {
        active: false,
        count: 0,
        total: 0
      },
      visible: true
    },
    buttons: [{text: '取消'}, {text: '确定'}]
  },
  onLoad() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    self.data.timer = setInterval(() => {
      if (self.data.ready) {
        clearInterval(self.data.timer)
      } else {
        wx.showLoading({
          title: '请耐心等候',
          mask: true
        })
      }
    }, 3000)
    self.listenMenu()
  },
  onUnload() {
    let self = this
    if (self.data.timer) {
      clearInterval(self.data.timer)
    }
    if (self.data.watcher) {
      self.data.watcher.close()
    }
  },
  listenMenu() {
    let self = this
    self.data.watcher = db.collection('menu').where({
      is_deleted: false
    }).orderBy('priority', 'asc').watch({
      onChange: function (snapshot) {
        wx.hideLoading()
        let list = snapshot.docs
        let show = []
        list.forEach(item => {
          if (item.name.includes(self.data.search.value)) {
            show.push(item)
          }
        })
        self.setData({
          ready: true,
          'data.list': list,
          'data.show': show
        })
      },
      onError: function (err) {
        console.log('reconnect menu')
        setTimeout(() => {
          self.listenMenu()
        }, 3000)
      }
    })
  },
  inputChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
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
  switchChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  showDialog(e) {
    let self = this
    let item = tools.getItem(self.data.data.list, '_id', e.currentTarget.dataset.id)
    let temp = item.sku.total - item.sku.count
    self.setData({
      current: item,
      dialog: true,
      'form.sku.active': item.sku.active,
      'form.sku.count': 0,
      'form.sku.total': temp > 0 ? temp : 0,
      'form.visible': item.visible
    })
  },
  tapDialog(e) {
    let self = this
    if (e.detail.index) {
      wx.showLoading({
        title: '正在保存',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'menu',
        data: {
          action: 'update',
          id: self.data.current._id,
          data: self.data.form,
          sid: app.globalData.identity.staff._id
        },
      }).then(res => {
        if (res.result && res.result.errcode == 0) {
          wx.showToast({
            title: '操作成功',
            icon: 'success',
            duration: 2000
          })
          self.setData({
            dialog: false
          })
        } else {
          wx.showToast({
            title: '操作失败',
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
    } else {
      self.setData({
        dialog: false
      })
    }
  },
  search() {
    let self = this
    let value = self.data.search.temp.trim()
    let list = self.data.data.list
    let show = []
    list.forEach(item => {
      if (item.name.includes(value)) {
        show.push(item)
      }
    })
    self.setData({
      'data.show': show,
      'search.value': value
    })
  }
})