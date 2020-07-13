Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    list: {
      type: Array,
      value: []
    },
    scope: {
      type: String,
      value: ''
    },
    value: {
      type: Array,
      value: []
    }
  },
  data: {
    show: false,
    checked: []
  },
  methods: {
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
        scope: self.data.scope,
        value: self.data.checked
      })
    }
  }
})