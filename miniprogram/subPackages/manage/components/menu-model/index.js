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
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }],
    dialog: false,
    index: null,
    form: {
      name: '',
      raise: 0
    },
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '规格名称是必填项'
      }]
    }, {
      name: 'raise',
      rules: [{
        range: [0, 999],
        message: '增加价格的范围0~999999'
      }]
    }],
    dialogButtons: [{
      text: '取消'
    }, {
      text: '确认'
    }]
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
      let list = []
      if (value) {
        list.push({
          name: '正常',
          raise: 0
        })
      }
      self.setData({
        active: value,
        list: list
      })
      self.triggerEvent('change', {
        active: value,
        list: list
      })
    },
    create() {
      this.setData({
        'form.name': '',
        'form.raise': 0,
        index: null,
        dialog: true
      })
    },
    tapItem(e) {
      let self = this
      let list = self.data.list
      let index = e.currentTarget.dataset.index
      if (e.detail.index) {
        if (index) {
          list.splice(index, 1)
          self.setData({
            list: list
          })
          self.triggerEvent('change', {
            active: true,
            list: list
          })
        } else {
          wx.showToast({
            title: '默认项不可删除',
            icon: 'none',
            duration: 2000
          })
        }
      } else {
        let item = list[index]
        self.setData({
          'form.name': item.name,
          'form.raise': item.raise / 100,
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
    inputDigit(e) {
      let value = e.detail.value
      if (value.charAt(value.length - 1) != '.') {
        this.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
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
            if(self.data.index==null) {
              list.push({
                name: form.name,
                raise: parseInt(form.raise * 100),
              })
            } else {
              let item = list[self.data.index]
              item.name = form.name
              item.raise = parseInt(form.raise * 100)
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