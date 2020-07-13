const app = getApp()
const db = wx.cloud.database()

Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    data: {
      type: Object,
      value: null
    },
    count: {
      type: Object,
      value: null
    },
    remain: {
      type: Object,
      value: null
    },
    show: {
      type: Boolean,
      value: false,
      observer: '_showChange'
    }
  },
  data: {
    top: 0,
    ready: false,
    watcher: null,
    list: [],
    dialog: false,
    current: null,
    temp_user: {}
  },
  lifetimes: {
    attached() {
      this.setData({
        top: app.globalData.customBarHeight + 8
      })
    },
    detached() {
      let self = this
      if (self.data.timer) {
        clearInterval(self.data.timer)
      }
      if (self.data.watcher) {
        self.data.watcher.close()
      }
    }
  },
  methods: {
    _showChange(value) {
      let self = this
      if (!self.data.ready) {
        self.listenAssist()
      }
    },
    listenAssist() {
      let self = this
      self.data.watcher = db.collection('menu_assist').where({
        master: app.globalData.identity.uid
      }).watch({
        onChange(snapshot) {
          let list = snapshot.docs
          let uids = []
          list.forEach(item => {
            uids.push(item.assist)
          })
          app.tempUserReadyCallback = () => {
            self.setData({
              temp_user: app.globalData.temp_user
            })
          }
          app.syncTempUser(uids)
          self.setData({
            list: list,
            ready: true
          })
        },
        onError(err) {
          console.log('reconnect assist')
          setTimeout(() => {
            self.listenAssist()
          }, 3000)
        }
      })
    },
    open(e) {
      let self = this
      self.setData({
        current: self.data.list[e.currentTarget.dataset.index],
        dialog: true
      })
    },
    close() {
      this.setData({
        dialog: false
      })
    },
    remove() {
      let self = this
      wx.showLoading({
        title: '正在操作',
        mask: true
      })
      db.collection('menu_assist').doc(self.data.current._id).remove().then(res=>{
        wx.showToast({
          title: '操作成功',
          icon: 'success',
          duration: 2000
        })
        self.setData({
          dialog: false
        })
      }).catch(err=>{
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    },
    showDetail(e) {
      let self = this
      self.setData({
        dialog: false
      })
      self.triggerEvent('detail', {
        id: e.currentTarget.dataset.id
      })
    },
    selectMenu(e) {
      let self = this
      self.setData({
        dialog: false
      })
      self.triggerEvent('choose', {
        id: e.currentTarget.dataset.id
      })
    },
    showLack() {
      wx.showToast({
        icon: 'none',
        title: '当前菜品备料不足',
        duration: 2000
      })
    }
  }
})