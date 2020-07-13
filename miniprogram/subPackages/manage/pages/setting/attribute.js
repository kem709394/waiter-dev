const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    list: [],
    form: {
      name: '',
      items: ''
    },
    rules: [{
      name: 'name',
      rules: [{
        required: true,
        message: '属性名称是必填项'
      }]
    },{
      name: 'items',
      rules: [{
        required: true,
        message: '属性字段是必填项'
      }]
    }],
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }],
    index: null,
    dialog: false,
    dialogButtons: [{
      text: '取消'
    }, {
      text: '确认'
    }]
  },
  onLoad() {
    let self = this
    self.setData({
      config: app.globalData.config
    })
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    db.collection('config').doc('attribute').get().then(res => {
      wx.hideLoading()
      let content = res.data.content
      self.setData({
        list: tools.objCopy(content.list)
      })
    })
  },
  inputChange(e) {
    let self = this
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: e.detail.value,
        [e.currentTarget.dataset.field]: e.detail.value
      })
    } else {
      self.setData({
        [e.currentTarget.dataset.field]: e.detail.value
      })
    }
  },
  create() {
    this.setData({
      index: null,
      dialog: true,
      'form.name': '',
      'form.items': ''
    })
  },
  tapItem(e) {
    let self = this
    let list = self.data.list
    let index = e.currentTarget.dataset.index
    if (e.detail.index) {
      wx.showModal({
        title: '操作提示',
        content: '确定要删除当前属性？',
        success(res) {
          if (res.confirm) {
            list.splice(index, 1)
            self.setData({
              list: list
            })
            self.update()
          }
        }
      }) 
    } else {
      let item = list[index]
      self.setData({
        'form.name': item.name,
        'form.items': item.items,
        index: index,
        dialog: true
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
          let list= self.data.list
          let form = self.data.form
          if (self.data.index==null) {
            list.push({
              name: form.name,
              items: form.items
            })
          } else {
            let item = list[self.data.index]
            item.name = form.name
            item.items = form.items
          }
          self.setData({
            list: list,
            dialog: false
          })
          self.update()
        }
      })
    } else {
      self.setData({
        dialog: false
      })
    }
  },
  update() {
    let self = this
    wx.showLoading({
      title: '正在更新',
      mask: true
    })
    db.collection('config').doc('attribute').update({
      data: {
        content: {
          list: self.data.list
        },
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res=>{
      wx.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 2000
      })
    }).catch(err=>{
      wx.showToast({
        title: '系统繁忙',
        icon: 'none',
        duration: 2000
      })
    })
  }
})