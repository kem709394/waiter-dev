const app = getApp()
const moment = require('../../../../utils/moment.min.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    value: {
      type: String,
      value: '',
      observer: '_valueChange'
    }
  },
  data: {
    show: false,
    list: [],
    state: {},
    checked: ''
  },
  lifetimes: {
    attached() {
      let self = this
      self.setData({
        list: app.globalData.table
      })
      wx.cloud.callFunction({
        name: 'statistics',
        data: {
          action: 'table_state',
          date_string: moment().format('YYYY-MM-DD')
        }
      }).then(res => {
        if (res.result && res.result.errcode == 0) {
          let state = {}
          res.result.list.forEach(item => {
            state[item.table] = item
          })
          self.setData({
            state: state
          })
        }
      })
    }
  },
  methods: {
    _valueChange(value) {
      this.setData({
        value: value
      })
    },
    open() {
      let self = this
      self.setData({
        show: true,
        checked: self.data.value
      })
    },
    close() {
      this.setData({
        show: false
      })
    },
    choose(e) {
      this.setData({
        checked: e.detail.value
      })
    },
    affirm() {
      let self = this
      self.setData({
        show: false
      })
      self.triggerEvent('affirm', {
        value: self.data.checked
      })
    }
  }
})