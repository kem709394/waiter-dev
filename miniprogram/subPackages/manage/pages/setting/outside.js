const app = getApp()
const db = wx.cloud.database()
const tools = require('../../../../utils/tools.js')

Page({
  data: {
    config: null,
    curTab: '0',
    form: {
      swiper: [],
      notify: {
        active: false,
        template: {
          success: '',
          cancel: '',
          finish: ''
        }
      },
      voucher: {
        active: false,
        printer: []
      },
      payment: 'true',
      remark_items: '',
      use_distance: 50,
      delivery: {
        active: false,
        auto_receive: false,
        auto_make: false,
        timerange: [],
        advance: 0,
        section: [],
        notify: {
          active: false,
          template: {
            sendout: '',
            receive: ''
          }
        }
      },
      takeaway: {
        active: false,
        auto_receive: false,
        auto_make: false,
        timerange: [],
        advance: 0
      }
    }
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
    db.collection('config').doc('outside').get().then(res => {
      let content = res.data.content
      self.setData({
        'form.swiper': tools.objCopy(content.swiper),
        'form.notify': tools.objCopy(content.notify),
        'form.voucher': tools.objCopy(content.voucher),
        'form.payment': content.payment,
        'form.use_distance': content.use_distance,
        'form.remark_items': tools.objCopy(content.remark_items),
        'form.delivery': tools.objCopy(content.delivery),
        'form.takeaway': tools.objCopy(content.takeaway)
      })
      wx.hideLoading()
    })
  },
  tabChange(e) {
    this.setData({
      curTab: e.currentTarget.dataset.key
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
  inputNumber(e) {
    let self = this
    let value = e.detail.value
    if (/^[0-9]*$/.test(value)) {
      self.setData({
        [e.currentTarget.dataset.field]: Number(value)
      })
    }
    if (e.currentTarget.dataset.rule) {
      self.setData({
        [e.currentTarget.dataset.rule]: value
      })
    }
  },
  inputDigit(e) {
    let self = this
    let value = e.detail.value
    if (value.charAt(value.length - 1) != '.') {
      if (e.currentTarget.dataset.rule) {
        self.setData({
          [e.currentTarget.dataset.rule]: e.detail.value,
          [e.currentTarget.dataset.field]: Number(value)
        })
      } else {
        self.setData({
          [e.currentTarget.dataset.field]: Number(value)
        })
      }
    } else {
      if (e.currentTarget.dataset.rule) {
        self.setData({
          [e.currentTarget.dataset.rule]: e.detail.value
        })
      }
    }
  },
  switchChange(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    })
  },
  albumChange(e) {
    this.setData({
      'form.swiper': e.detail
    })
  },
  voucherChange(e) {
    this.setData({
      'form.voucher': e.detail
    })
  },
  timerangeChange1(e) {
    this.setData({
      'form.delivery.timerange': e.detail
    })
  },
  timerangeChange2(e) {
    this.setData({
      'form.takeaway.timerange': e.detail
    })
  },
  sectionChange(e) {
    this.setData({
      'form.delivery.section': e.detail.list
    })
  },
  submitForm() {
    let self = this
    let form = self.data.form
    wx.showLoading({
      title: '正在保存',
      mask: true
    })
    db.collection('config').doc('outside').update({
      data: {
        content: form,
        update_sid: app.globalData.identity.staff._id,
        update_time: db.serverDate()
      }
    }).then(res=>{
      wx.showToast({
        title: '保存成功',
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