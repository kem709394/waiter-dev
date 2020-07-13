const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    config: {},
    ready: false,
    timer: {
      queue: null,
      time: null
    },
    watcher: null,
    list: [],
    total: 0,
    remain: 0,
    checked: {},
    current: null,
    dialog: false,
    form: {
      amount: 1,
      note: '',
      print: true
    },
    rules: [{
      name: 'amount',
      rules: [{
        required: true,
        message: '使用人数是必填项'
      }]
    }],
    buttons: [{text: '取消'}, {text: '确定'}]
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config
    })
    self.data.timer.time = setInterval(() => {
      self.setData({
        current: new Date().getTime()
      })
    }, 1000)
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    self.data.timer.queue = setInterval(() => {
      if (self.data.ready) {
        clearInterval(self.data.timer.queue)
      } else {
        wx.showLoading({
          title: '请耐心等候',
          mask: true
        })
      }
    }, 3000)
    self.listen()
  },
  onUnload() {
    let self = this
    if (self.data.timer.time) {
      clearInterval(self.data.timer.time)
    }
    if (self.data.timer.queue) {
      clearInterval(self.data.timer.queue)
    }
    if (self.data.watcher) {
      self.data.watcher.close()
    }
  },
  listen() {
    let self = this
    self.data.watcher = db.collection('queue').where({}).orderBy('create_time', 'asc').watch({
      onChange: function (snapshot) {
        let list = []
        let data = snapshot.docs
        data.forEach(item => {
          if (item.progress == 'wait' || item.progress == 'ready') {
            item.wait_time = item.create_time.getTime()
            if (item.progress == 'ready') {
              item.ready_time = item.ready_time.getTime()
            }
            list.push(item)
          }
        })
        wx.hideLoading()
        self.setData({
          ready: true,
          list: list,
          total: data.length,
          remain: list.length
        })
      },
      onError: function (err) {
        console.log('reconnect queue')
        setTimeout(() => {
          self.listen()
        }, 3000)
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
  ready(e) {
    wx.cloud.callFunction({
      name: 'queue',
      data: {
        action: 'ready',
        id: e.currentTarget.dataset.id
      }
    }).then(res => { }).catch(console.error)
  },
  finish(e) {
    let self = this
    wx.showLoading({
      title: '正在操作',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'queue',
      data: {
        action: 'finish',
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
  open() {
    let self = this
    let content = self.data.config.queue
    content.open = true
    wx.showLoading({
      title: '正在设置',
      mask: true
    })
    db.collection('config').doc('queue').update({
      data: {
        content: content,
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res => {
      wx.showToast({
        title: '设置成功',
        icon: 'success',
        duration: 2000
      })
      self.setData({
        'config.queue': content
      })
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  close() {
    let self = this
    let content = self.data.config.queue
    content.open = false
    wx.showLoading({
      title: '正在设置',
      mask: true
    })
    db.collection('config').doc('queue').update({
      data: {
        content: content,
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res => {
      wx.showToast({
        title: '设置成功',
        icon: 'success',
        duration: 2000
      })
      self.setData({
        'config.queue': content
      })
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: '系统繁忙',
        duration: 2000
      })
    })
  },
  showDialog() {
    this.setData({
      dialog: true,
      'form.amount': 1,
      'form.note': '',
      'form.print': true,
      'models.amount': 1
    })
  },
  tapDialog(e) {
    let self = this
    if (e.detail.index) {
      self.selectComponent('#form').validate((valid, errors) => {
        if (!valid) {
          const firstError = Object.keys(errors)
          if (firstError.length) {
            self.setData({
              error: errors[firstError[0]].message
            })
          }
        } else {
          if (!self.data.hold) {
            self.setData({
              dialog: false
            })
            self.data.hold = true
            wx.showLoading({
              title: '正在提交',
              mask: true
            })
            wx.cloud.callFunction({
              name: 'queue',
              data: {
                action: 'create_passive',
                data: self.data.form
              }
            }).then(res => {
              self.data.hold = false
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
          }
        }
      })
    } else {
      self.setData({
        dialog: false
      })
    }
  },
  destroy() {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要清空排队？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'queue',
            data: {
              action: 'destroy'
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
        }
      }
    })
  }
})