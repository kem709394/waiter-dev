const tools = require('../../../../utils/tools.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    value: {
      type: Array,
      value: [],
      observer: '_valueChange'
    }
  },
  data: {
    show: false,
    list: [],
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }],
    index: null,
    dialog: false,
    form: {
      range: [],
      minute: 0,
      shipping_fee: 0,
      starting_money: 0 
    },
    dialogButtons: [{
      text: '取消'
    }, {
      text: '确认'
    }]
  },
  methods: {
    _valueChange(value) {
      this.setData({
        list: value
      })
    },
    inputNumber(e) {
      let value = e.detail.value
      if (value.charAt(value.length - 1) != '.') {
        this.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
    },
    inputDigit(e) {
      let value = e.detail.value
      if (value.charAt(value.length - 1) != '.') {
        this.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
    },
    create() {
      this.setData({
        'form.range': [0,0],
        'form.minute': 0,
        'form.shipping_fee': 0,
        'form.starting_money': 0,
        index: null,
        dialog: true
      })
    },
    tapItem(e) {
      let self = this
      let list = self.data.list
      let index = e.currentTarget.dataset.index
      if (e.detail.index) {
        list.splice(index,1)
        self.setData({
          list: list
        })
        self.triggerEvent('change', list)
      } else {
        let item = list[index]
        self.setData({
          'form.range': tools.objCopy(item.range),
          'form.minute': item.minute,
          'form.shipping_fee': item.shipping_fee/100,
          'form.starting_money': item.starting_money/100,
          index: index,
          dialog: true
        })
      }
    },
    tapDialog(e) {
      let self = this
      if (e.detail.index) {
        let list = self.data.list
        let form = self.data.form
        if(self.data.index==null) {
          list.push({
            range: tools.objCopy(form.range),
            minute: form.minute,
            shipping_fee: parseInt(form.shipping_fee * 100),
            starting_money: parseInt(form.starting_money * 100)
          })
        } else {
          let item = list[self.data.index]
          item.range = tools.objCopy(form.range)
          item.minute = form.minute
          item.shipping_fee = parseInt(form.shipping_fee * 100)
          item.starting_money = parseInt(form.starting_money * 100)
        }
        self.setData({
          list: list,
          dialog: false
        })
        self.triggerEvent('change', {
          list: list
        })
      } else {
        self.setData({
          dialog: false
        })
      }
    }
  }
})