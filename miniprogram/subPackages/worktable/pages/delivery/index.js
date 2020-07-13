const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    config: null,
    customBarHeight: 0,
    watcher: null,
    curTab: 'active',
    order: {
      data: {},
      order_sn: '',
      detail: null
    },
    active: {
      top: 0,
      list: []
    },
    record: {
      top: 0,
      current: 0,
      finish: false,
      loading: false,
      triggered: false,
      size: 20,
      list: [],
      total: 0,
      grain: '',
      date: ''
    },
    filter: {
      dialog: false,
      grain: '',
      date: '',
      maxDay: '',
      buttons: [{
        text: '取消'
      }, {
        text: '确定'
      }]
    },
    retreat: {
      dialog: false,
      index: null,
      form: {
        note: ''
      },
      rules: [{
        name: 'note',
        rules: [{
          required: true,
          message: '退单说明是必填项'
        }]
      }],
      buttons: [{
        text: '取消'
      }, {
        text: '确定'
      }]
    },
    subscribe: 0
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config,
      customBarHeight: app.globalData.customBarHeight,
      'filter.maxDay': moment().format('YYYY-MM-DD')
    })
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('delivery')
      .aggregate()
      .match({
        state: 1,
        delivery_sid: app.globalData.identity.staff._id
      }).sort({
        delivery_time: 1
      }).limit(1000).end().then(res => {
        let ids = []
        let list = res.list
        let order = self.data.order.data
        list.forEach(item=>{
          if (!order[item.order_id]) {
            ids.push(item.order_id)
          }
          item.time = moment(item.delivery_time).format('YYYY-MM-DD HH:mm')
        })
        self.setData({
          'active.list': list
        })
        if (ids.length) {
          self.loadOrder(ids)
        }
        wx.hideLoading()
      }).catch(err => {
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    self.listenSubscribe()
  },
  onUnload() {
    let self = this
    if (self.data.watcher) {
      self.data.watcher.close()
    }
  },
  listenSubscribe() {
    let self = this
    self.data.watcher = db.collection('staff').where({
      _id: app.globalData.identity.staff._id
    }).watch({
      onChange: function (snapshot) {
        if (snapshot.docs.length) {
          let staff = snapshot.docs[0]
          if (staff.remain_delivery_notify) {
            self.setData({
              subscribe: staff.remain_delivery_notify
            })
          }
        }
      },
      onError: function (err) {
        console.log('reconnect subscribe')
        setTimeout(() => {
          self.listenSubscribe()
        }, 3000)
      }
    })
  },
  loadOrder(ids) {
    let self = this
    db.collection('outside_order')
      .aggregate()
      .match({
        _id: _.in(ids)
      }).limit(1000).end().then(res=>{
      let data = self.data.order.data
      res.list.forEach(item=>{
        item.time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
        data[item._id] = item
      })
      self.setData({
        'order.data': data
      })
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
  scrollTop() {
    let self = this
    if (self.data.curTab == 'active') {
      self.setData({
        'active.top': 0
      })
    } else if (self.data.curTab == 'record') {
      self.setData({
        'record.top': 0
      })
    }
  },
  tabChange(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    self.setData({
      curTab: key,
      detail: null
    })
    if (key == 'receive') {
      wx.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode'],
        success(res) {
          wx.showLoading({
            title: '正在查询',
            mask: true
          })
          db.collection('outside_order').doc(res.result).get().then(res => {
            wx.hideLoading()
            if (res.data) {
              self.checkOrder(res.data)
            } else {
              wx.showToast({
                icon: 'none',
                title: '找不到订单',
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
      })
    } else if (key == 'record') {
      if (self.data.record.total == 0) {
        self.initRecord()
      }
    }
  },
  search() {
    let self = this
    if (self.data.order.order_sn != '') {
      wx.showLoading({
        title: '正在查询',
        mask: true
      })
      db.collection('outside_order').where({
        order_sn: self.data.order.order_sn
      }).get().then(res => {
        wx.hideLoading()
        if (res.data.length > 0) {
          self.checkOrder(res.data[0])
        } else {
          wx.showToast({
            icon: 'none',
            title: '找不到订单',
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
  },
  checkOrder(detail) {
    let self = this
    if (!detail.is_deleted && detail.mode == 'delivery') {
      if (detail.state > 10 && detail.state < 20 && detail.delivery_state < 1) {
        let data = self.data.order.data
        data[detail._id] = detail
        detail.time = moment(detail.create_time).format('YYYY-MM-DD HH:mm')
        self.setData({
          'order.data': data,
          'order.detail': detail
        })
        return
      }
    }
    wx.showToast({
      icon: 'none',
      title: '找不到订单',
      duration: 2000
    })
  },
  receive() {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要领取订单？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'delivery',
            data: {
              action: 'receive',
              order_id: self.data.order.detail._id
            }
          }).then(res => {
            if (res.result) {
              if (res.result.errcode == 0) {
                wx.showToast({
                  icon: 'success',
                  title: '操作成功',
                  duration: 2000
                })
                let list = self.data.active.list
                list.unshift({
                  _id: res.result.id,
                  order_id: self.data.order.detail._id,
                  time: moment().format('YYYY-MM-DD HH:mm')
                })
                self.setData({
                  curTab: 'active',
                  'order.detail': null,
                  'active.list': list
                })
              } else {
                wx.showToast({
                  icon: 'none',
                  title: res.result.errmsg,
                  duration: 2000
                })
              }
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
  },
  retreat(e) {
    this.setData({
      'retreat.dialog': true,
      'retreat.index': e.currentTarget.dataset.index,
      'retreat.form.note': ''
    })
  },
  tapRetreat(e) {
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
          let index = self.data.retreat.index
          let list = self.data.active.list
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'delivery',
            data: {
              action: 'retreat',
              id: list[index]._id,
              note: self.data.retreat.form.note
            }
          }).then(res => {
            if (res.result) {
              if (res.result.errcode == 0) {
                wx.showToast({
                  icon: 'success',
                  title: '操作成功',
                  duration: 2000
                })
                list.splice(index, 1)
                self.setData({
                  'retreat.dialog': false,
                  'active.list': list
                })
              } else {
                wx.showToast({
                  icon: 'none',
                  title: res.result.errmsg,
                  duration: 2000
                })
              }
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
      })
    } else {
      self.setData({
        'retreat.dialog': false
      })
    }
  },
  finish(e) {
    let self = this
    wx.showModal({
      title: '操作确定',
      content: '确定要完成订单？',
      success(res) {
        if (res.confirm) {
          let index = e.currentTarget.dataset.index
          let list = self.data.active.list
          wx.showLoading({
            title: '正在操作',
            mask: true
          })
          wx.cloud.callFunction({
            name: 'delivery',
            data: {
              action: 'finish',
              id: list[index]._id
            }
          }).then(res => {
            console.log(res)
            if (res.result && res.result.errcode == 0) {
              wx.showToast({
                icon: 'success',
                title: '操作成功',
                duration: 2000
              })
              list.splice(index, 1)
              self.setData({
                'active.list': list
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
  },
  initRecord() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let aggregate = db.collection('delivery').aggregate().match({
      state: 2,
      delivery_sid: app.globalData.identity.staff._id
    })
    if (self.data.record.grain != '') {
      let format = '%Y-%m-%d'
      if (self.data.record.grain == 'year') {
        format = '%Y'
      } else if (self.data.record.grain == 'month') {
        format = '%Y-%m'
      }
      aggregate = aggregate.addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: format,
          timezone: 'Asia/Shanghai'
        })
      }).match({
        formatDate: self.data.record.date
      })
    }
    aggregate.count('total').end().then(res => {
      wx.hideLoading()
      let total = 0
      if (res.list.length > 0) {
        total = res.list[0].total
      }
      self.setData({
        'record.current': 0,
        'record.finish': false,
        'record.loading': false,
        'record.list': [],
        'record.total': total
      })
      if (total > 0) {
        self.loadRecord()
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  refreshRecord() {
    let self = this
    setTimeout(() => {
      self.setData({
        'record.triggered': false
      })
      self.initRecord()
    }, 1000)
  },
  loadRecord() {
    let self = this
    if (!self.data.record.finish && !self.data.record.loading) {
      self.setData({
        'record.loading': true
      })
      let aggregate = db.collection('delivery')
        .aggregate()
        .match({
          state: 2,
          delivery_sid: app.globalData.identity.staff._id
        })
      if (self.data.record.grain != '') {
        let format = '%Y-%m-%d'
        if (self.data.record.grain == 'year') {
          format = '%Y'
        } else if (self.data.record.grain == 'month') {
          format = '%Y-%m'
        }
        aggregate = aggregate.addFields({
            formatDate: $.dateToString({
              date: '$finish_time',
              format: format,
              timezone: 'Asia/Shanghai'
            })
          })
          .match({
            formatDate: self.data.record.date
          })
      }
      aggregate.sort({
        delivery_time: -1
      }).skip(self.data.record.current).limit(self.data.record.size).end().then(res => {
        let ids = []
        let list = self.data.record.list
        let order = self.data.order.data
        res.list.forEach(item => {
          item.time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
          list.push(item)
          if (!order[item.order_id]) {
            ids.push(item.order_id)
          }
        })
        if (ids.length) {
          self.loadOrder(ids)
        }
        self.setData({
          'record.loading': false,
          'record.finish': res.list.length < self.data.record.size,
          'record.current': res.list.length + self.data.record.current,
          'record.list': list
        })
      })
    }
  },
  filter() {
    this.setData({
      'filter.grain': '',
      'filter.date': '',
      'filter.dialog': true
    })
  },
  tapFilter(e) {
    let self = this
    if (e.detail.index) {
      self.setData({
        'record.grain': self.data.filter.grain,
        'record.date': self.data.filter.date,
        'filter.dialog': false
      })
      self.initRecord()
    } else {
      self.setData({
        'filter.dialog': false
      })
    }
  },
  grainChange(e) {
    let key = e.currentTarget.dataset.key
    let date = ''
    if (key == 'year') {
      date = moment().format('YYYY')
    } else if (key == 'month') {
      date = moment().format('YYYY-MM')
    } else if (key == 'day') {
      date = moment().format('YYYY-MM-DD')
    }
    this.setData({
      'filter.grain': key,
      'filter.date': date
    })
  },
  dateChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  subscribe() {
    let tmplIds = [this.data.config.outside.delivery.notify.template.receive]
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success(res) {
        wx.showToast({
          icon: 'success',
          title: '订阅成功！',
          duration: 2000
        })
        db.collection('staff').doc(app.globalData.identity.staff._id).update({
          data: {
            remain_delivery_notify: _.inc(1)
          }
        })
      },
      fail(err) {
        wx.showToast({
          icon: 'none',
          title: '订阅失败！',
          duration: 2000
        })
      }
    })
  },
  copyText(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.text,
      success(res) {}
    })
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  },
  openMap(e) {
    let address = e.currentTarget.dataset.address
    let location = e.currentTarget.dataset.location
    if (location.coordinate.coordinates) {
      wx.openLocation({
        latitude: location.coordinate.coordinates[1],
        longitude: location.coordinate.coordinates[0],
        scale: 15,
        name: location.name,
        address: address
      })
    } else {
      wx.openLocation({
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        scale: 15,
        name: location.name,
        address: address
      })
    }
  }
})