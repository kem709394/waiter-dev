const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const $ = db.command.aggregate
const tools = require('../../../../utils/tools.js')
const moment = require('../../../../utils/moment.min.js')

Page({
  data: {
    customBarHeight: 0,
    privilege: [],
    title: '',
    drawer: false,
    config: {},
    refresh: false,
    curTab: 'inside',
    tabItems: [],
    inside: {
      top: 0,
      grain: '',
      date: '',
      current: 0,
      ready: false,
      finish: false,
      loading: false,
      refresh: false,
      size: 20,
      list: [],
      total: 0
    },
    outside: {
      top: 0,
      grain: '',
      date: '',
      current: 0,
      ready: false,
      finish: false,
      loading: false,
      refresh: false,
      size: 20,
      list: [],
      total: 0
    },
    book: {
      top: 0,
      grain: '',
      date: '',
      current: 0,
      ready: false,
      finish: false,
      loading: false,
      refresh: false,
      size: 20,
      list: [],
      total: 0
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
    }
  },
  onLoad(options) {
    let self = this
    let tabItems = []
    let privilege = app.globalData.identity.staff.privilege
    if (privilege.includes('order-inside_data')) {
      tabItems.push({
        key: 'order-inside_data',
        title: '点餐'
      })
    }
    if (privilege.includes('order-outside_data')) {
      tabItems.push({
        key: 'order-outside_data',
        title: '外卖'
      })
    }
    if (privilege.includes('order-book_data')) {
      tabItems.push({
        key: 'order-book_data',
        title: '订桌'
      })
    }
    self.setData({
      customBarHeight: app.globalData.customBarHeight,
      privilege: privilege,
      title: options.title,
      config: app.globalData.config,
      curTab: tabItems[0].key,
      tabItems: tabItems,
      'filter.maxDay': moment().format('YYYY-MM-DD')
    })
    self.init()
  },
  showDrawer() {
    let self = this
    self.selectComponent('#drawer-menu').show()
    self.setData({
      drawer: true
    })
  },
  hideDrawer() {
    let self = this
    self.selectComponent('#drawer-page').hide()
    self.setData({
      drawer: false
    })
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (app.globalData.update) {
        switch (self.data.curTab) {
          case 'order-inside_data':
            self.initInside()
            break
          case 'order-outside_data':
            self.initOutside()
            break
          case 'order-book_data':
            self.initBook()
            break
        }
        app.globalData.update = false
      }
    } else {
      self.data.back = true
    }
  },
  init() {
    let self = this
    switch (self.data.curTab) {
      case 'order-inside_data':
        self.initInside()
        break
      case 'order-outside_data':
        self.initOutside()
        break
      case 'order-book_data':
        self.initBook()
        break
    }
  },
  initInside() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let aggregate = db.collection('inside_order').aggregate().match({
      is_deleted: false
    })
    if (self.data.inside.grain != '') {
      let format = '%Y-%m-%d'
      if (self.data.inside.grain == 'year') {
        format = '%Y'
      } else if (self.data.inside.grain == 'month') {
        format = '%Y-%m'
      }
      aggregate = aggregate.addFields({
        formatDate: $.dateToString({
          date: '$create_time',
          format: format,
          timezone: 'Asia/Shanghai'
        })
      }).match({
        formatDate: self.data.inside.date
      })
    }
    aggregate.count('total').end().then(res=>{
      wx.hideLoading()
      let total = 0
      if (res.list.length > 0) {
        total = res.list[0].total
      }
      self.setData({
        'inside.current': 0,
        'inside.ready': true,
        'inside.finish': false,
        'inside.loading': false,
        'inside.refresh': false,
        'inside.list': [],
        'inside.total': total
      })
      if (total > 0) {
        self.loadInside()
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  loadInside() {
    let self = this
    if (!self.data.inside.finish && !self.data.inside.loading) {
      self.setData({
        'inside.loading': true
      })
      let aggregate = db.collection('inside_order').aggregate().match({
        is_deleted: false
      })
      if (self.data.inside.grain != '') {
        let format = '%Y-%m-%d'
        if (self.data.inside.grain == 'year') {
          format = '%Y'
        } else if (self.data.inside.grain == 'month') {
          format = '%Y-%m'
        }
        aggregate = aggregate.addFields({
          formatDate: $.dateToString({
            date: '$create_time',
            format: format,
            timezone: 'Asia/Shanghai'
          })
        }).match({
          formatDate: self.data.inside.date
        })
      }
      aggregate.sort({
        create_time: -1
      }).skip(self.data.inside.current).limit(self.data.inside.size).end().then(res=>{
        let list = self.data.inside.list
        res.list.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          if (item.cancel_time) {
            item.cancel_time = moment(item.cancel_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.receive_time) {
            item.receive_time = moment(item.receive_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.make_time) {
            item.make_time = moment(item.make_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.finish_time) {
            item.finish_time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
          }
          list.push(item)
        })
        self.setData({
          'inside.loading': false,
          'inside.finish': res.list.length < self.data.inside.size,
          'inside.current': res.list.length + self.data.inside.current,
          'inside.list': list
        })
      })
    }
  },
  showInside(e) {
    app.globalData.temp_data = tools.objCopy(this.data.inside.list[e.currentTarget.dataset.index])
    wx.navigateTo({
      url: 'inside/detail'
    })
  },
  initOutside() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let aggregate = db.collection('outside_order').aggregate().match({
      is_deleted: false
    })
    if (self.data.outside.grain != '') {
      let format = '%Y-%m-%d'
      if (self.data.outside.grain == 'year') {
        format = '%Y'
      } else if (self.data.outside.grain == 'month') {
        format = '%Y-%m'
      }
      aggregate = aggregate.addFields({
        formatDate: $.dateToString({
          date: '$create_time',
          format: format,
          timezone: 'Asia/Shanghai'
        })
      }).match({
        formatDate: self.data.outside.date
      })
    }
    aggregate.count('total').end().then(res => {
      wx.hideLoading()
      let total = 0
      if (res.list.length > 0) {
        total = res.list[0].total
      }
      self.setData({
        'outside.current': 0,
        'outside.ready': true,
        'outside.finish': false,
        'outside.loading': false,
        'outside.refresh': false,
        'outside.list': [],
        'outside.total': total
      })
      if (total > 0) {
        self.loadOutside()
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  loadOutside() {
    let self = this
    if (!self.data.outside.finish && !self.data.outside.loading) {
      self.setData({
        'outside.loading': true
      })
      let aggregate = db.collection('outside_order').aggregate().match({
        is_deleted: false
      })
      if (self.data.outside.grain != '') {
        let format = '%Y-%m-%d'
        if (self.data.outside.grain == 'year') {
          format = '%Y'
        } else if (self.data.outside.grain == 'month') {
          format = '%Y-%m'
        }
        aggregate = aggregate.addFields({
          formatDate: $.dateToString({
            date: '$create_time',
            format: format,
            timezone: 'Asia/Shanghai'
          })
        }).match({
          formatDate: self.data.outside.date
        })
      }
      aggregate.sort({
        create_time: -1
      }).skip(self.data.outside.current).limit(self.data.outside.size).end().then(res => {
        let list = self.data.outside.list
        res.list.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          if (item.cancel_time) {
            item.cancel_time = moment(item.cancel_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.receive_time) {
            item.receive_time = moment(item.receive_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.make_time) {
            item.make_time = moment(item.make_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.finish_time) {
            item.finish_time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
          }
          list.push(item)
        })
        self.setData({
          'outside.loading': false,
          'outside.finish': res.list.length < self.data.outside.size,
          'outside.current': res.list.length + self.data.outside.current,
          'outside.list': list
        })
      })
    }
  },
  showOutside(e) {
    app.globalData.temp_data = tools.objCopy(this.data.outside.list[e.currentTarget.dataset.index])
    wx.navigateTo({
      url: 'outside/detail'
    })
  },
  initBook() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let aggregate = db.collection('book_order').aggregate().match({
      is_deleted: false
    })
    if (self.data.book.grain != '') {
      let format = '%Y-%m-%d'
      if (self.data.book.grain == 'year') {
        format = '%Y'
      } else if (self.data.book.grain == 'month') {
        format = '%Y-%m'
      }
      aggregate = aggregate.addFields({
        formatDate: $.dateToString({
          date: '$create_time',
          format: format,
          timezone: 'Asia/Shanghai'
        })
      }).match({
        formatDate: self.data.book.date
      })
    }
    aggregate.count('total').end().then(res => {
      wx.hideLoading()
      let total = 0
      if (res.list.length > 0) {
        total = res.list[0].total
      }
      self.setData({
        'book.current': 0,
        'book.ready': true,
        'book.finish': false,
        'book.loading': false,
        'book.refresh': false,
        'book.list': [],
        'book.total': total
      })
      if (total > 0) {
        self.loadBook()
      }
    }).catch(err => {
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  },
  loadBook() {
    let self = this
    if (!self.data.book.finish && !self.data.book.loading) {
      self.setData({
        'book.loading': true
      })
      let aggregate = db.collection('book_order').aggregate().match({
        is_deleted: false
      })
      if (self.data.book.grain != '') {
        let format = '%Y-%m-%d'
        if (self.data.book.grain == 'year') {
          format = '%Y'
        } else if (self.data.book.grain == 'month') {
          format = '%Y-%m'
        }
        aggregate = aggregate.addFields({
          formatDate: $.dateToString({
            date: '$create_time',
            format: format,
            timezone: 'Asia/Shanghai'
          })
        }).match({
          formatDate: self.data.book.date
        })
      }
      aggregate.sort({
        create_time: -1
      }).skip(self.data.book.current).limit(self.data.book.size).end().then(res => {
        let list = self.data.book.list
        res.list.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
          if (item.cancel_time) {
            item.cancel_time = moment(item.cancel_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.receive_time) {
            item.receive_time = moment(item.receive_time).format('YYYY-MM-DD HH:mm')
          }
          if (item.finish_time) {
            item.finish_time = moment(item.finish_time).format('YYYY-MM-DD HH:mm')
          }
          list.push(item)
        })
        self.setData({
          'book.loading': false,
          'book.finish': res.list.length < self.data.book.size,
          'book.current': res.list.length + self.data.book.current,
          'book.list': list
        })
      })
    }
  },
  showBook(e) {
    app.globalData.temp_data = tools.objCopy(this.data.book.list[e.currentTarget.dataset.index])
    wx.navigateTo({
      url: 'book/detail'
    })
  },
  totop() {
    let self = this
    if (self.data.curTab == 'order-inside_data') {
      self.setData({
        'inside.top': 0
      })
    } else if (self.data.curTab == 'order-outside_data') {
      self.setData({
        'outside.top': 0
      })
    } else if (self.data.curTab == 'order-book_data') {
      self.setData({
        'book.top': 0
      })
    }
  },
  changeTab(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    self.setData({
      curTab: key
    })
    if (key == 'order-inside_data') {
      if (!self.data.inside.ready) {
        self.initInside()
      }
    } else if (key == 'order-outside_data') {
      if (!self.data.outside.ready) {
        self.initOutside()
      }
    } else if (key == 'order-book_data') {
      if (!self.data.book.ready) {
        self.initBook()
      }
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
      if (self.data.curTab == 'order-inside_data') {
        self.setData({
          'filter.dialog': false,
          'inside.grain': self.data.filter.grain,
          'inside.date': self.data.filter.date
        })
        self.initInside()
      } else if (self.data.curTab == 'order-outside_data') {
        self.setData({
          'filter.dialog': false,
          'outside.grain': self.data.filter.grain,
          'outside.date': self.data.filter.date
        })
        self.initOutside()
      } else if (self.data.curTab == 'order-book_data') {
        self.setData({
          'filter.dialog': false,
          'book.grain': self.data.filter.grain,
          'book.date': self.data.filter.date
        })
        self.initBook()
      }
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
      [e.currentTarget.dataset.key]: e.detail.value
    })
  }
})