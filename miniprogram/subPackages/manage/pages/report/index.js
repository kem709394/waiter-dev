const app = getApp()
const db = wx.cloud.database()
const moment = require('../../../../utils/moment.min.js')
const wxCharts = require('../../../../utils/wxcharts.js')

Page({
  data: {
    title: '',
    windowWidth: 0,
    customBarHeight: 0,
    privilege: [],
    curTab: 'order',
    order: {
      chart: null,
      index: 0,
      flag: false,
      grain: '5-day',
      date: ''
    },
    menu: {
      grain: 'day',
      date: '',
      flag: false,
      list: []
    },
    delivery: {
      grain: 'day',
      date: '',
      staff: 0,
      flag: false,
      list: []
    },
    viewOptions: [{
      value: '5-day',
      name: '最近5日'
    }, {
      value: '5-month',
      name: '最近5月'
    }, {
      value: '5-year',
      name: '最近5年'
    }, {
      value: 'day',
      name: '按日统计'
    }, {
      value: 'month',
      name: '按月统计'
    }, {
      value: 'year',
      name: '按年统计'
    }],
    staffOptions: [{
      value: '',
      name: '全部'
    }],
    maxDay: ''
  },
  onLoad(options) {
    let self = this
    self.setData({
      title: options.title,
      windowWidth: app.globalData.windowWidth,
      customBarHeight: app.globalData.customBarHeight,
      privilege: app.globalData.identity.staff.privilege,
      maxDay: moment().format('YYYY-MM-DD')
    })
    self.showOrder()
    self.getStaff()
  },
  changeTab(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    if (key == 'order') {
      self.showOrder()
    } else if (key == 'menu') {
      self.showMenu()
    } else if (key == 'delivery') {
      self.showDelivery()
    }
    self.setData({
      curTab: key
    })
  },
  getStaff() {
    let self = this
    let options = self.data.staffOptions
    db.collection('staff')
      .aggregate()
      .match({
        is_deleted: false
      })
      .sort({
        priority: 1
      }).limit(1000).end().then(res => {
        res.list.forEach(item => {
          options.push({
            value: item._id,
            name: item.full_name
          })
        })
        self.setData({
          staffOptions: options
        })
      })
  },
  showOrder() {
    let self = this
    if (!self.data.order.chart) {
      wx.showLoading({
        title: '正在加载',
        mask: true
      })
      let option = self.data.viewOptions[self.data.order.index].value
      let arr = option.split('-')
      wx.cloud.callFunction({
        name: 'statistics',
        data: {
          action: 'order_' + arr[1],
          days: Number(arr[0])
        }
      }).then(res => {
        let categories = []
        let series = {
          book: [],
          inside: [],
          outside: []
        }
        res.result.forEach(item => {
          categories.push(item.date_string)
          series.book.push(item.book)
          series.inside.push(item.inside)
          series.outside.push(item.outside)
        })
        self.data.order.chart = new wxCharts({
          canvasId: 'order-canvas',
          dataPointShape: false,
          type: 'column',
          categories: categories,
          series: [{
            name: '点餐',
            data: series.inside
          }, {
            name: '外卖',
            data: series.outside
          }, {
            name: '订桌',
            data: series.book
          }],
          yAxis: {
            format: function(val) {
              return val + '单';
            }
          },
          xAxis: {
            disableGrid: true,
          },
          width: self.data.windowWidth,
          height: 350,
          dataLabel: true
        })
        wx.hideLoading()
      })
    }
  },
  showMenu() {
    let self = this
    if (!self.data.menu.flag) {
      self.setData({
        'menu.grain': 'day',
        'menu.date': moment().format('YYYY-MM-DD'),
        'menu.flag': true
      })
      self.loadMenu()
    }
  },
  showDelivery() {
    let self = this
    if (!self.data.delivery.flag) {
      self.setData({
        'delivery.grain': 'day',
        'delivery.date': moment().format('YYYY-MM-DD'),
        'delivery.staff': 0,
        'delivery.flag': true
      })
      self.loadDelivery()
    }
  },
  setOrderChart(data) {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'statistics',
      data: data,
    }).then(res => {
      let categories = []
      let series = {
        book: [],
        inside: [],
        outside: []
      }
      res.result.forEach(item => {
        categories.push(item.date_string)
        series.book.push(item.book)
        series.inside.push(item.inside)
        series.outside.push(item.outside)
      })
      self.data.order.chart.updateData({
        categories: categories,
        series: [{
          name: '点餐',
          data: series.inside
        }, {
          name: '外卖',
          data: series.outside
        }, {
          name: '订桌',
          data: series.book
        }]
      })
      wx.hideLoading()
    })
  },
  loadMenu() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'menu_stat',
        date_string: self.data.menu.date
      }
    }).then(res => {
      let list = []
      for (let key in res.result) {
        list.push(res.result[key])
      }
      self.setData({
        'menu.list': list
      })
      wx.hideLoading()
    })
  },
  loadDelivery() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let sid = self.data.staffOptions[self.data.delivery.staff].value
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'delivery_stat',
        date_string: self.data.delivery.date,
        sid: sid == '' ? null : sid
      }
    }).then(res => {
      let list = []
      for (let key in res.result) {
        list.push(res.result[key])
      }
      self.setData({
        'delivery.list': list
      })
      wx.hideLoading()
    })
  },
  viewChange(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    let option = self.data.viewOptions[e.detail.value].value
    let data = {}
    if (key == 'order') {
      if (option.indexOf('-') == -1) {
        switch (option) {
          case 'day':
            data.action = 'order_day'
            data.date_string = moment().format('YYYY-MM-DD')
            break
          case 'month':
            data.action = 'order_month'
            data.date_string = moment().format('YYYY-MM')
            break
          case 'year':
            data.action = 'order_year'
            data.date_string = moment().format('YYYY')
            break
        }
        self.setData({
          'order.index': e.detail.value,
          'order.grain': option,
          'order.flag': true,
          'order.date': data.date_string
        })
      } else {
        self.setData({
          'order.index': e.detail.value,
          'order.grain': option,
          'order.flag': false
        })
        let arr = option.split('-')
        switch (arr[1]) {
          case 'day':
            data.action = 'order_day'
            data.days = Number(arr[0])
            break
          case 'month':
            data.action = 'order_month'
            data.months = Number(arr[0])
            break
          case 'year':
            data.action = 'order_year'
            data.years = Number(arr[0])
            break
        }
      }
      self.setOrderChart(data)
    }
  },
  grainChange(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    let date = moment().format('YYYY-MM-DD')
    if (key == 'year') {
      date = moment().format('YYYY')
    } else if (key == 'month') {
      date = moment().format('YYYY-MM')
    }
    if (self.data.curTab == 'menu') {
      self.setData({
        'menu.grain': key,
        'menu.date': date
      })
      self.loadMenu()
    } else if (self.data.curTab == 'delivery') {
      self.setData({
        'delivery.grain': key,
        'delivery.date': date
      })
      self.loadDelivery()
    }
  },
  dateChange(e) {
    let self = this
    let key = e.currentTarget.dataset.key
    let value = e.detail.value
    self.setData({
      [key]: value
    })
    switch(key) {
      case 'order.date':
        self.setOrderChart({
          action: 'order_' + self.data.order.grain,
          date_string: value
        })
        break
      case 'menu.date':
        self.loadMenu()
        break
      case 'delivery.date':
        self.loadDelivery()
        break
    }
  },
  staffChange(e) {
    let self = this
    self.setData({
      'delivery.staff': e.detail.value
    })
    self.loadDelivery()
  },
  exportMenuExcel() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'export_menu_stat',
        date_string: self.data.menu.date
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result && res.result.errcode == 0) {
        wx.cloud.downloadFile({
          fileID: res.result.fileID,
          success: res => {
            wx.openDocument({
              filePath: res.tempFilePath,
              success: function(res) {}
            })
          },
          fail: console.error
        })
      }
    })
  },
  exportDeliveryExcel() {
    let self = this
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    let sid = self.data.staffOptions[self.data.delivery.staff].value
    wx.cloud.callFunction({
      name: 'statistics',
      data: {
        action: 'export_delivery_stat',
        date_string: self.data.delivery.date,
        sid: sid == '' ? null : sid
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result && res.result.errcode == 0) {
        wx.cloud.downloadFile({
          fileID: res.result.fileID,
          success: res => {
            wx.openDocument({
              filePath: res.tempFilePath,
              success: function (res) { }
            })
          },
          fail: console.error
        })
      }
    })
  }
})