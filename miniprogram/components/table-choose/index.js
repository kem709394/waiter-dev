Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true
  },
  properties: {
    name: {
      type: String,
      value: ''
    },
    list: {
      type: Array,
      value: []
    },
    show: {
      type: Boolean,
      value: false,
      observer: '_showChange'
    }
  },
  methods: {
    tableChange(e) {
      this.triggerEvent('tableChange', {
        value: e.currentTarget.dataset.value
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})