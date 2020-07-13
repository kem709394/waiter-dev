const app = getApp()

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    date: {
      type: String,
      value: '',
      observer: '_dateChange'
    },
    value: {
      type: Array,
      value: []
    }
  },
  data: {
    show: false,
    list: [],
    state: {},
    checked: []
  },
  lifetimes: {
    attached() {
      this.setData({
        list: app.globalData.table.map(item=>{
          return {
            name: item.name,
            value: item._id,
            contain: item.contain
          }
        })
      })
    }
  },
  methods: {
    _dateChange(value) {
      let self = this
      let state = {}
      wx.cloud.callFunction({
        name: 'statistics',
        data: {
          action: 'table_book',
          date_string: value
        }
      }).then(res => {
        if (res.result && res.result.errcode == 0) {
          res.result.list.forEach(item1 => {
            item1.table_ids.forEach(item2 => {
              if (state[item2]) {
                state[item2].push(item1.time_range)
              } else {
                state[item2] = [item1.time_range]
              }
            })
          })
          self.setData({
            state: state
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
      self.setData({
        show: true,
        checked: self.data.value.map(item=>{
          return item.value
        })
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
      let list = self.data.list.filter(item=>{
        return self.data.checked.includes(item.value)
      })
      self.triggerEvent('affirm', {
        value: list
      })
    }
  }
})