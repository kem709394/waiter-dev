const app = getApp()
const db = wx.cloud.database()
const $ = db.command.aggregate
const moment = require('../../utils/moment.min.js')

Page({
  data: {
    customBarHeight: 0,
    config: {},
    granted: false,
    curTab: 'inside',
    tabItems: [],
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
      list: []
    },
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
      list: []
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
      list: []
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
    let config = app.globalData.config
    let tabItems = []
    if (config.inside.arrival.active || config.inside.reserve.active) {
      tabItems.push({
        key: 'inside',
        title: '点餐'
      })
    }
    if (config.outside.takeaway.active || config.outside.delivery.active) {
      tabItems.push({
        key: 'outside',
        title: '外卖'
      })
    }
    if (config.book.active) {
      tabItems.push({
        key: 'book',
        title: '订桌'
      })
    }
    self.setData({
      customBarHeight: app.globalData.customBarHeight,
      config: config,
      curTab: tabItems[0].key,
      tabItems: tabItems,
      'filter.maxDay': moment().format('YYYY-MM-DD')
    })
    if (app.globalData.identity) {
      self.init()
    } else {
      app.identityReadyCallback = () => {
        self.init()
      }
      app.authorize()
    }
  },
  onShow() {
    let self = this
    if (self.data.back) {
      if (!self.data.granted && app.globalData.identity) {
        self.init()
      }
    } else {
      self.data.back = true
    }
  },
  init() {
    let self = this
    self.setData({
      granted: true
    })
    switch (self.data.curTab) {
      case 'inside':
        self.initInside()
        break
      case 'outside':
        self.initOutside()
        break
      case 'book':
        self.initBook()
        break
    }
  },
  initInside() {
    let self = this
    self.setData({
      'inside.current': 0,
      'inside.ready': true,
      'inside.finish': false,
      'inside.loading': false,
      'inside.refresh': false,
      'inside.list': []
    })
    self.loadInside()
  },
  loadInside() {
    let self = this
    if (!self.data.inside.finish && !self.data.inside.loading) {
      self.setData({
        'inside.loading': true
      })
      let aggregate = db.collection('inside_order').aggregate().match({
        openid: '{openid}',
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
      }).skip(self.data.inside.current).limit(self.data.inside.size).end().then(res => {
        let list = self.data.inside.list
        res.list.forEach(item => {
          item.create_time = moment(item.create_time).format('YYYY-MM-DD HH:mm')
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
    wx.navigateTo({
      url: '/pages/order/inside/detail?id=' + e.currentTarget.dataset.id
    })
  },
  initOutside() {
    let self = this
    self.setData({
      'outside.current': 0,
      'outside.ready': true,
      'outside.finish': false,
      'outside.loading': false,
      'outside.refresh': false,
      'outside.list': []
    })
    self.loadOutside()
  },
  loadOutside() {
    let self = this
    if (!self.data.outside.finish && !self.data.outside.loading) {
      self.setData({
        'outside.loading': true
      })
      let aggregate = db.collection('outside_order').aggregate().match({
        is_deleted: false,
        openid: '{openid}'
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
    wx.navigateTo({
      url: '/pages/order/outside/detail?id=' + e.currentTarget.dataset.id
    })
  },
  initBook() {
    let self = this
    self.setData({
      'book.current': 0,
      'book.ready': true,
      'book.finish': false,
      'book.loading': false,
      'book.refresh': false,
      'book.list': []
    })
    self.loadBook()
  },
  loadBook() {
    let self = this
    if (!self.data.book.finish && !self.data.book.loading) {
      self.setData({
        'book.loading': true
      })
      let aggregate = db.collection('book_order').aggregate().match({
        is_deleted: false,
        openid: '{openid}'
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
    wx.navigateTo({
      url: '/pages/order/book/detail?id=' + e.currentTarget.dataset.id
    })
  },
  totop() {
    let self = this
    if (self.data.curTab == 'inside') {
      self.setData({
        'inside.top': 0
      })
    } else if (self.data.curTab == 'outside') {
      self.setData({
        'outside.top': 0
      })
    } else if (self.data.curTab == 'book') {
      self.setData({
        'book.top': 0
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
      if (self.data.curTab == 'inside') {
        self.setData({
          'filter.dialog': false,
          'inside.grain': self.data.filter.grain,
          'inside.date': self.data.filter.date
        })
        self.initInside()
      } else if (self.data.curTab == 'outside') {
        self.setData({
          'filter.dialog': false,
          'outside.grain': self.data.filter.grain,
          'outside.date': self.data.filter.date
        })
        self.initOutside()
      } else if (self.data.curTab == 'book') {
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
  },
  changeTab(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    self.setData({
      curTab: key
    })
    if (key == 'inside') {
      if (!self.data.inside.ready) {
        self.initInside()
      }
    } else if (key == 'outside') {
      if (!self.data.outside.ready) {
        self.initOutside()
      }
    } else if (key == 'book') {
      if (!self.data.book.ready) {
        self.initBook()
      }
    }
  },
  login() {
    let self = this
    app.identityReadyCallback = () => {
      self.init()
    }
    app.authorize()
  },
  scanCode() {
    let self = this
    if (self.data.curTab=='inside') {
      wx.navigateTo({
        url: 'inside/collect'
      })
    } else if (self.data.curTab=='outside') {
      wx.navigateTo({
        url: 'outside/collect'
      })
    }
  }
})