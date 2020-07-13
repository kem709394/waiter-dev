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
    index: null,
    form: {
      start: 0,
      end: 0
    },
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }]
  },
  methods: {
    _valueChange(value) {
      this.setData({
        list: value
      })
    },
    create() {
      this.setData({
        'form.start': 0,
        'form.end': 0,
        index: null,
        show: true
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
          'form.start': item.start,
          'form.end': item.end,
          index: index,
          show: true
        })
      }
    },
    affirm(e) {
      let self = this
      let list = self.data.list
      let form = e.detail
      if (self.data.index) {
        let index = self.data.index
        list[index].start = form.start
        list[index].end = form.end
      } else {
        list.push(form)
      }
      self.triggerEvent('change', list)
      self.setData({
        show: false,
        list: list
      })
    }
  }
})