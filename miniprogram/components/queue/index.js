const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const tools = require('../../utils/tools.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    granted: {
      type: Boolean,
      value: false,
      observer: '_grantedChange'
    },
    coordinate: {
      type: Object,
      value: null,
      observer: '_coordinateChange'
    }
  },
  data: {
    show: false,
    timer: null,
    watcher: null,
    current: null,
    config: null,
    data: null,
    total: 0,
    index: 0,
    dialog: false,
    form: {},
    rules: [{
      name: 'amount',
      rules: [{
        required: true,
        message: '使用人数是必填项'
      }, {
        range: [1, 100],
        message: '使用人数范围为1和100之间'
      }]
    }, {
      name: 'note',
      rules: [{
        maxlength: 20,
        message: '备注说明不能超过20个字符'
      }]
    }],
    buttons: [{
      text: '取消'
    }, {
      text: '确认'
    }]
  },
  lifetimes: {
    attached() {
      let self = this
      if (app.globalData.identity) {
        self.setData({
          granted: true,
          config: app.globalData.config
        })
        self.init()
      } else {
        self.setData({
          config: app.globalData.config
        })
      }
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
    _grantedChange() {
      let self = this
      self.setData({
        granted: true
      })
      self.init()
    },
    _coordinateChange() {
      let self = this
      let config = app.globalData.config
      let coordinate1 = self.data.coordinate
      let coordinate2 = config.base.location.coordinate
      let distance = tools.getDistance(coordinate1.latitude, coordinate1.longitude, coordinate2.coordinates[1], coordinate2.coordinates[0])
      if (distance > config.queue.use_distance) {
        self.setData({
          show: false
        })
      } else {
        self.setData({
          show: true
        })
      }
    },
    init() {
      let self = this
      self.data.timer = setInterval(() => {
        self.setData({
          current: new Date().getTime()
        })
      }, 1000)
      self.listen()
    },
    login() {
      let self = this
      app.identityReadyCallback = () => {
        self.setData({
          granted: true
        })
        self.init()
      }
      app.authorize()
    },
    listen() {
      let self = this
      self.data.watcher = db.collection('queue').where({
        openid: '{openid}',
        progress: _.in(['wait', 'ready'])
      }).watch({
        onChange(snapshot) {
          self.update(snapshot.docs)
        },
        onError(err) {
          console.log('reconnect queue')
          setTimeout(() => {
            self.listen()
          }, 3000)
        }
      })
    },
    update(list) {
      let index = 0
      let data = null
      list.forEach((item, i) => {
        if (item.openid == app.globalData.identity.openid) {
          item.time = item.create_time.getTime()
          data = item
          index = i
        }
      })
      this.setData({
        total: list.length,
        index: index,
        data: data
      })
    },
    create() {
      let self = this
      if (self.data.data) {
        wx.showToast({
          icon: 'success',
          title: '您已取号,请耐心等候',
          duration: 2000
        })
      } else {
        self.setData({
          'form.amount': 1,
          'form.note': '',
          dialog: true
        })
      }
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
            self.setData({
              dialog: false
            })
            let config = self.data.config
            if (config.queue.notify.active) {
              wx.requestSubscribeMessage({
                tmplIds: [config.queue.notify.template.remind],
                success(res) {
                  self.submit()
                }
              })
            } else {
              self.submit()
            }
          }
        })
      } else {
        self.setData({
          dialog: false
        })
      }
    },
    submit() {
      let self = this
      wx.showLoading({
        title: '正在提交',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'queue',
        data: {
          action: 'create_active',
          data: self.data.form
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
    stopEvent() {}
  }
})