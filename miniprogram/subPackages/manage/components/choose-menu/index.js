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
    value: {
      type: Array,
      value: []
    },
    show: {
      type: Boolean,
      value: false,
      observer: '_showChange'
    }
  },
  data: {
    checked: []
  },
  methods: {
    _showChange() {
      let self = this
      self.setData({
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
      self.triggerEvent('affirm', {
        value: self.data.checked
      })
      self.setData({
        show: false
      })
    }
  }
})