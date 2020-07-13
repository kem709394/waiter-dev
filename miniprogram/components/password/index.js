Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    title: {
      type: String,
      value: ''
    },
    password: {
      type: String,
      value: ''
    },
    dark: {
      type: Boolean,
      value: false
    },
    show: {
      type: Boolean,
      value: false,
      observer: '_showChange'
    }
  },
  data: {
    width: 0,
    height: 0,
    value: '',
    array: ['','','','','',''],
    active: false,
    error: ''
  },
  methods: {
    _showChange() {
      let self = this
      let query = self.createSelectorQuery()
      query.select('.weui-dialog__bd').boundingClientRect()
      query.exec((res) => {
        if (res[0]) {
          let width = (res[0].width - 48) / 6
          self.setData({
            width: width,
            height: width
          })
        }
      })
      let length = self.data.password.length
      let array = new Array(length)
      for(let i=0; i<array.length; i++) {
        array[i] = ''
      }
      self.setData({
        value: '',
        array: array,
        active: false,
        error: ''
      })
    },
    inputChange(e) {
      let self = this
      let value = e.detail.value
      let array = self.data.array
      for (let i=0; i<array.length; i++) {
        if (value.length > i) {
          if (self.data.dark) {
            array[i] = '●'
          } else {
            array[i] = value.charAt(i)
          }
        } else {
          array[i] = ''
        }
      }
      self.setData({
        value: value,
        array: array,
        error: ''
      })
      if (value.length == self.data.password.length) {
        if (value == self.data.password) {
          self.setData({
            show: false
          })
          self.triggerEvent('pass')
        } else {
          self.setData({
            error: '密码错误'
          })
        }
      }
    },
    activeInput() {
      this.setData({
        active: true
      })
    },
    close() {
      let self = this
      self.setData({
        show: false
      })
      self.triggerEvent('cancel')
    },
    stopEvent() {}
  }
})