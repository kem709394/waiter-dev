const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate

Page({
  data: {
    current: 0,
    finish: false,
    loading: false,
    size: 20,
    list: [],
    total: 0,
    detail: null,
    dialog: false,
    buttons: [{
      text: '确认'
    }]
  },
  onLoad(options) {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('notice').where({
      is_deleted: false,
      visible: true
    }).count().then(res => {
      wx.hideLoading()
      self.setData({
        current: 0,
        finish: false,
        loading: false,
        list: [],
        total: res.total
      })
      self.load()
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  load() {
    let self = this
    if (!self.data.finish && !self.data.loading) {
      self.setData({
        loading: true
      })
      db.collection('notice').aggregate().match({
        is_deleted: false,
        visible: true
      }).sort({
        priority: 1,
        create_time: 1
      }).skip(self.data.current).limit(self.data.size).end().then(res => {
        let list = self.data.list
        res.list.forEach(item => {
          list.push(item)
        })
        self.setData({
          loading: false,
          finish: res.list.length < self.data.size,
          current: res.list.length + self.data.current,
          list: list
        })
      })
    }
  },
  detail(e) {
    let self= this
    self.setData({
      detail: self.data.list[e.currentTarget.dataset.index],
      dialog: true
    })
  },
  tapNotice(){
    this.setData({
      dialog: false
    })
  }
})