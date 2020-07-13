Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true
  },
  properties: {
    data: {
      type: Object,
      value: null
    },
    list: {
      type: Array,
      value: [],
      observer: '_listChange'
    },
    show: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    _listChange(value) {
      if (value.length == 0) {
        this.setData({
          show: false
        })
      }
    },
    clearOrder() {
      this.triggerEvent('clearOrder')
    },
    affirmOrder() {
      this.setData({
        show: false
      })
      self.triggerEvent('affirmOrder')
    },
    addAmount(e) {
      this.triggerEvent('addAmount', {
        index: e.currentTarget.dataset.index
      })
    },
    subAmount(e) {
      this.triggerEvent('subAmount', {
        index: e.currentTarget.dataset.index
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})