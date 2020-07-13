const app = getApp()
const tools = require('../../../../utils/tools.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    value: {
      type: Object,
      value: null,
      observer: '_valueChange'
    }
  },
  data: {
    active: false,
    list: [],
    buttons: [{
      text: '修改'
    }, {
      text: '删除',
      type: 'warn'
    }],
    dialog: false,
    index: null,
    form: {
      name: '',
      items: []
    },
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '属性名称是必填项'
      }]
    }, {
      name: 'items',
      rules: [{
        required: true,
        message: '属性字段是必填项'
      }]
    }],
    dialogButtons: [{
      text: '取消'
    }, {
      text: '确认'
    }],
    fieldButtons: [{
      text: '删除',
      type: 'warn'
    }],
    attribute: {}
  },
  lifetimes: {
    attached() {
      let config = app.globalData.config
      let attribute = {}
      config.attribute.list.forEach(item => {
        attribute[item.name] = item.items.split(/[ ]+/)
      })
      this.setData({
        attribute: attribute
      })
    }
  },
  methods: {
    _valueChange(value) {
      this.setData({
        active: value.active,
        list: value.list
      })
    },
    activeChange(e) {
      let self = this
      let value = e.detail.value
      self.setData({
        active: value,
        list: []
      })
      self.triggerEvent('change', {
        active: value,
        list: []
      })
    },
    create() {
      this.setData({
        'form.name': '',
        'form.items': [''],
        index: null,
        dialog: true
      })
    },
    tapItem(e) {
      let self = this
      let list = self.data.list
      let index = e.currentTarget.dataset.index
      if (e.detail.index) {
        list.splice(index, 1)
        self.setData({
          list: list
        })
        self.triggerEvent('change', {
          active: true,
          list: list
        })
      } else {
        let item = list[index]
        self.setData({
          'form.name': item.name,
          'form.items': tools.objCopy(item.items),
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
    tapField(e) {
      let self = this
      let index = e.currentTarget.dataset.index
      let items = self.data.form.items
      items.splice(index, 1)
      self.setData({
        'form.items': items
      })
    },
    addField(e) {
      let self = this
      let items = self.data.form.items
      items.push('')
      self.setData({
        'form.items': items
      })
    },
    tagField(e) {
      let self = this
      let value = e.currentTarget.dataset.value
      let items = self.data.form.items
      if (items[0] == '') {
        items[0] = value
      } else {
        items.push(value)
      }
      self.setData({
        'form.items': items
      })
    },
    inputField(e) {
      let self = this
      let index = e.currentTarget.dataset.index
      let items = self.data.form.items
      items[index] = e.detail.value
      self.setData({
        'form.items': items
      })
    },
    tapDialog(e) {
      let self = this
      if (e.detail.index) {
        self.selectComponent('#form').validate((valid, errors) => {
          if (!valid) {
            const firstError = Object.keys(errors)
            if (firstError.length) {
              self.setData({
                error: errors[firstError[0]].message
              })
            }
          } else {
            let list = self.data.list
            let form = self.data.form
            if (self.data.index==null) {
              list.push({
                name: form.name,
                items: tools.objCopy(form.items)
              })
            } else {
              let item = list[self.data.index]
              item.name = form.name
              item.items = tools.objCopy(form.items)
            }
            self.setData({
              list: list,
              dialog: false
            })
            
            self.triggerEvent('change', {
              active: true,
              list: list
            })
          }
        })
      } else {
        self.setData({
          dialog: false
        })
      }
    }
  }
})