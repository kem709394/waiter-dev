const app = getApp()

Page({
  data: {
    title: '',
    curItem: ''
  },
  onLoad(options) {
    this.setData({
      title: options.title
    })
  },
  toggleItem(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    if (self.data.curItem == key) {
      self.setData({
        curItem: ''
      })
    } else {
      self.setData({
        curItem: key
      })
    }
  }
})