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
    clear() {
      let self = this
      self.setData({
        show: false
      })
      self.triggerEvent('clear')
    },
    remove(e) {
      this.triggerEvent('remove', {
        id: e.currentTarget.dataset.id
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})