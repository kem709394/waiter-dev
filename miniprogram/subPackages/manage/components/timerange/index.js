const app = getApp()

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    value: {
      type: Object,
      value: null
    },
    show: {
      type: Boolean,
      value: false,
      observer: '_showChange'
    }
  },
  data: {
    current: [0,0]
  },
  methods: {
    _showChange(value) {
      let self = this
      self.setData({
        current: [self.data.value.start,self.data.value.end-1]
      })
    },
    change(e) {
      this.setData({
        start: e.detail.value[0],
        end: e.detail.value[1] + 1
      })
    },
    affirm() {
      let self = this
      self.triggerEvent('affirm', {
        start: self.data.start,
        end: self.data.end
      })
      self.setData({
        show: false
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})