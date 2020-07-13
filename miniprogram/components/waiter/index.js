const app = getApp()
const db = wx.cloud.database()

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  data: {
    active: false,
    timer: null,
    watcher: null,
    current: null,
    invoke: {
      show: false,
      list: [],
      note: '',
      buttons: [{
        text: '隐藏'
      }],
      animation: null
    },
    assist: {
      animation: null
    },
    serviceOptions: []
  },
  lifetimes: {
    attached() {
      let self = this
      self.data.timer = setInterval(() => {
        self.setData({
          current: new Date().getTime()
        })
      }, 1000)
      self.listenInvoke()
      self.setData({
        serviceOptions: app.globalData.config.invoke.service_items.split(/[ ]+/)
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
    listenInvoke() {
      let self = this
      self.data.watcher = db.collection('invoke').where({
        openid: app.globalData.identity.openid,
        table: wx.getStorageSync('cur_table')
      }).watch({
        onChange(snapshot) {
          let list = []
          snapshot.docs.forEach(item=>{
            item.time=item.create_time.getTime()
            list.push(item)
          })
          self.setData({
            'invoke.list': list
          })
        },
        onError(err) {
          console.log('reconnect invoke')
          setTimeout(() => {
            self.listenInvoke()
          }, 3000)
        }
      })
    },
    inputInvoke(e) {
      this.setData({
        'invoke.note': e.detail.value
      })
    },
    tagInvoke(e) {
      let self = this
      let note = self.data.invoke.note
      if (note.endsWith(' ')) {
        note += e.currentTarget.dataset.value
      } else {
        note += ' ' + e.currentTarget.dataset.value
      }
      self.setData({
        'invoke.note': note
      })
    },
    showInvoke() {
      this.setData({
        'invoke.show': true
      })
    },
    tapInvoke(e) {
      this.setData({
        'invoke.show': false
      })
    },
    cancelInvoke(e) {
      wx.showLoading({
        title: '正在操作',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'assist',
        data: {
          action: 'invoke_remove',
          id: e.currentTarget.dataset.id
        }
      }).then(res => {
        if (res.result && res.result.errcode == 0) {
          wx.showToast({
            icon: 'success',
            title: '操作成功',
            duration: 2000
          })
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
    },
    submitInvoke() {
      let self = this
      wx.showLoading({
        title: '正在提交',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'assist',
        data: {
          action: 'invoke_create',
          data: {
            table: wx.getStorageSync('cur_table'),
            note: self.data.invoke.note
          }
        }
      }).then(res => {
        if (res.result && res.result.errcode == 0) {
          wx.showToast({
            icon: 'success',
            title: '操作成功',
            duration: 1000
          })
          self.setData({
            'invoke.note': ''
          })
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
    },
    shareOrder() {
      let self = this
      self.setData({
        'link.active': false
      })
      self.backLink()
    },
    toggle() {
      let self = this
      if (self.data.active) {
        self.close()
        self.setData({
          active: false
        })
      } else {
        self.open()
        self.setData({
          active: true
        })
      }
    },
    open() {
      let animationAssist = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease-out'
      })
      let animationInvoke = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease-out'
      })
      animationAssist.translate(-140, 0).rotateZ(360).opacity(1).step()
      animationInvoke.translate(-100, -100).rotateZ(360).opacity(1).step()
      this.setData({
        'assist.animation': animationAssist.export(),
        'invoke.animation': animationInvoke.export()
      })
    },
    close() {
      let animationAssist = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease-out'
      })
      let animationInvoke = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease-out'
      })
      animationAssist.translate(0, 0).rotateZ(0).opacity(0).step()
      animationInvoke.translate(0, 0).rotateZ(0).opacity(0).step()
      this.setData({
        'assist.animation': animationAssist.export(),
        'invoke.animation': animationInvoke.export()
      })
    },
    stopEvent() {}
  }
})