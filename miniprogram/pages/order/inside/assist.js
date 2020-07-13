const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const tools = require('../../../utils/tools.js')
const moment = require('../../../utils/moment.min.js')

Page({
  data: {
    statusBarHeight: 0,
    customBarHeight: 0,
    menuButton: null,
    config: {},
    granted: false,
    master: {},
    timer: null,
    vtabs: [],
    activeTab: 0,
    current: null,
    dialog: {
      detail: false,
      checked: false
    },
    menu: {
      ready: false,
      data: {},
      remain: {},
      count: {}
    },
    record: null,
    checked: []
  },
  onLoad(options) {
    let self = this
    self.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      customBarHeight: app.globalData.customBarHeight,
      menuButton: app.globalData.menuButton,
      searchMenu: self.searchMenu.bind(self)
    })
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    self.data.timer = setInterval(() => {
      if (self.data.menu.ready) {
        clearInterval(self.data.timer)
      } else {
        wx.showLoading({
          title: '请耐心等候',
          mask: true
        })
      }
    }, 3000)
    if (app.globalData.config) {
      self.setData({
        config: app.globalData.config
      })
    } else {
      app.configReadyCallback = () => {
        self.setData({
          config: app.globalData.config
        })
      }
    }
    if (app.globalData.column) {
      self.loadColumn()
    } else {
      app.columnReadyCallback = () => {
        self.loadColumn()
      }
    }
    db.collection('user').doc(options.uid).get().then(res => {
      self.setData({
        master: res.data
      })
    })
    self.init()
  },
  onUnload() {
    let self = this
    if (self.data.timer) {
      clearInterval(self.data.timer)
    }
  },
  init() {
    let self = this
    if (app.globalData.identity) {
      self.setData({
        granted: true
      })
      self.loadRecord()
    } else {
      app.identityReadyCallback = () => {
        self.setData({
          granted: true
        })
        self.loadRecord()
      }
      app.authorize()
    }
  },
  loadMenu() {
    let self = this
    db.collection('menu')
      .aggregate()
      .match({
        is_deleted: false,
        visible: true,
        scope: 'inside'
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res => {
        let data = {}
        let remain = {}
        let vtabs = self.data.vtabs
        res.list.forEach(item1 => {
          data[item1._id] = item1
          if (item1.sku && item1.sku.active) {
            remain[item1._id] = item1.sku.total - item1.sku.count
          }
          vtabs.forEach(item2 => {
            if (item1.column.inside.includes(item2.id)) {
              item2.items.push(item1._id)
            }
          })
        })
        for (let key in data) {
          if (data[key].type == 'combo') {
            data[key].combo.forEach(item => {
              item.list = item.list.filter(temp => {
                return data[temp] != undefined
              })
            })
          }
        }
        self.setData({
          vtabs: vtabs,
          'menu.ready': true,
          'menu.data': data,
          'menu.remain': remain
        })
        wx.hideLoading()
      }).catch(err => {
        wx.hideLoading()
        wx.showModal({
          title: '加载失败',
          content: '网络不好，重新加载？',
          success(res) {
            if (res.confirm) {
              self.loadMenu()
            } else if (res.cancel) {
              self.home()
            }
          }
        })
      })
  },
  loadColumn() {
    let self = this
    let vtabs = self.data.vtabs
    app.globalData.column.forEach(item => {
      if (item.visible && item.scope.includes('inside')) {
        vtabs.push({
          id: item._id,
          title: item.name,
          items: []
        })
      }
    })
    self.loadMenu()
  },
  loadRecord() {
    let self = this
    db.collection('menu_assist').where({
      master: self.data.master._id,
      assist: app.globalData.identity.uid
    }).get().then(res=>{
      if (res.data.length) {
        let record = res.data[0]
        self.setData({
          record: record,
          checked: record.list
        })
      }
    })
  },
  searchMenu(value) {
    return new Promise((resolve, reject) => {
      let result = []
      let self = this
      let data = self.data.menu.data
      let column = self.data.vtabs.map(item => {
        return item.id
      })
      let keyword = value.trim()
      if (keyword != '') {
        for (let i in data) {
          let menu = data[i]
          if (menu.name.includes(keyword)) {
            menu.column.inside.forEach(item=>{
              if (column.includes(item)) {
                result.push({
                  text: menu.name, 
                  value: menu._id
                })
              }
            })
          }
        }
      }
      resolve(result)
    })
  },
  searchBack(e) {
    let self = this
    let id = e.detail.item.value
    self.setData({
      current: self.data.menu.data[id],
      'dialog.detail': true
    })
  },
  showDetail(e) {
    let self = this
    self.setData({
      current: self.data.menu.data[e.currentTarget.dataset.id],
      'dialog.detail': true
    })
  },
  toggleMenu(e) {
    let self = this
    if (!self.data.granted) {
      wx.showModal({
        title: '操作提示',
        content: '需要微信授权才能进行下一步操作',
        success(res) {
          if (res.confirm) {
            app.identityReadyCallback = () => {
              wx.hideLoading()
              self.setData({
                granted: true
              })
              self.loadRecord()
            }
            app.authorize()
          }
        }
      })
      return
    }
    let id = e.currentTarget.dataset.id
    let checked = self.data.checked
    if (checked.includes(id)) {
      checked = checked.filter(item => {
        return item != id
      })
    } else {
      checked.push(id)
    }
    self.setData({
      checked: checked
    })
  },
  toggleMenu2(e) {
    let self = this
    if (!self.data.granted) {
      wx.showModal({
        title: '操作提示',
        content: '需要微信授权才能进行下一步操作',
        success(res) {
          if (res.confirm) {
            app.identityReadyCallback = () => {
              wx.hideLoading()
              self.setData({
                granted: true
              })
              self.loadRecord()
            }
            app.authorize()
          }
        }
      })
      return
    }
    let id = self.data.current._id
    let checked = self.data.checked
    if (checked.includes(id)) {
      checked = checked.filter(item => {
        return item != id
      })
    } else {
      checked.push(id)
    }
    self.setData({
      checked: checked
    })
  },
  showChecked() {
    let self = this
    if (self.data.checked.length > 0) {
      self.setData({
        'dialog.checked': true
      })
    }
  },
  removeChecked(e) {
    let self = this
    let id = e.detail.id
    let checked = self.data.checked
    checked = checked.filter(item => {
      return item != id
    })
    self.setData({
      checked: checked
    })
  },
  clearChecked() {
    this.setData({
      checked: []
    })
  },
  affirmChecked() {
    let self = this
    if (self.data.checked.length==0) {
      wx.showToast({
        title: '请选择菜品',
        icon: 'none',
        duration: 2000
      })
      return
    }
    wx.showLoading({
      title: '正在提交',
      mask: true
    })
    if (self.data.record) {
      db.collection('menu_assist').doc(self.data.record._id).update({
        data: {
          list: self.data.checked,
          update_time: db.serverDate()
        }
      }).then(res=>{
        wx.showToast({
          title: '发送成功',
          icon: 'success',
          duration: 2000
        })
      }).catch(err=>{
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    } else {
      db.collection('menu_assist').add({
        data: {
          master: self.data.master._id,
          assist: app.globalData.identity.uid,
          list: self.data.checked,
          create_time: db.serverDate()
        }
      }).then(res=>{
        self.setData({
          record: {
            _id: res._id
          }
        })
        wx.showToast({
          title: '发送成功',
          icon: 'success',
          duration: 2000
        })
      }).catch(err=>{
        wx.showToast({
          title: '系统繁忙',
          icon: 'none',
          duration: 2000
        })
      })
    }
  },
  home() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },
  blank() {}
})