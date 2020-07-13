const app = getApp()
const tools = require('../../../../utils/tools.js')

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
    value: {
      type: Object,
      value: null,
      observer: '_valueChange'
    }
  },
  data: {
    list: [],
    active: false,
    printer: [],
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }],
    index: null,
    dialog: false,
    form: {
      index: null,
      page: 1
    },
    dialogButtons: [{
      text: '取消'
    }, {
      text: '确认'
    }]
  },
  lifetimes: {
    attached() {
      let list = []
      app.globalData.rt_data.printer.forEach((item) => {
        list.push({
          value: item._id,
          name: item.name
        })
      })
      this.setData({
        list: list
      })
    }
  },
  methods: {
    _valueChange(value) {
      this.setData({
        active: value.active,
        printer: value.printer
      })
    },
    activeChange(e) {
      let self = this
      let value = e.detail.value
      self.setData({
        active: value,
        printer: []
      })
      self.triggerEvent('change', {
        active: value,
        printer: []
      })
    },
    create() {
      this.setData({
        index: null,
        dialog: true,
        'form.index': null,
        'form.page': 1
      })
    },
    tapItem(e) {
      let self = this
      let printer = self.data.printer
      let index = e.currentTarget.dataset.index
      if (e.detail.index) {
        printer.splice(index, 1)
        self.setData({
          printer: printer
        })
        self.triggerEvent('change', {
          active: true,
          printer: printer
        })
      } else {
        let item = printer[index]
        self.setData({
          'form.index': tools.findIndex(self.data.list, 'value', item.id),
          'form.page': item.page,
          index: index,
          dialog: true
        })
      }
    },
    inputChange(e) {
      this.setData({
        [e.currentTarget.dataset.field]: e.detail.value
      })
    },
    inputNumber(e) {
      let self = this
      let value = e.detail.value
      if (/^[0-9]*$/.test(value)) {
        self.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
    },
    printerChange(e) {
      this.setData({
        'form.index': e.detail.value 
      })
    },
    tapDialog(e) {
      let self = this
      if (e.detail.index) {
        let form = self.data.form
        if (form.index==null) {
          self.setData({
            error: '打印设备是必选项'
          })
          return
        }
        if (form.page==0) {
          self.setData({
            error: '打印页数不能少于1'
          })
          return
        }
        let printer = self.data.printer
        if (self.data.index==null) {
          printer.push({
            id: self.data.list[form.index].value,
            page: form.page
          })
        } else {
          let item = printer[self.data.index]
          item.id = self.data.list[form.index].value
          item.page = form.page
        }
        self.setData({
          printer: printer,
          dialog: false
        })
        self.triggerEvent('change', {
          active: true,
          printer: printer
        })
      } else {
        self.setData({
          dialog: false
        })
      }
    }
  }
})