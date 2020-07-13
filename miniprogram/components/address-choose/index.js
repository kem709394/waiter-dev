const app = getApp()
const db = wx.cloud.database()
const tools = require('../../utils/tools.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  data: {
    show: false,
    list: [],
    usable: [],
    disable: [],
    current: null,
    selected: null,
    buttons: [{
      text: '编辑'
    }, {
      text: '删除',
      type: 'warn'
    }],
    maximum: 0,
    coordinate: null
  },
  lifetimes: {
    attached() {
      let self = this
      let maximum = 0
      let section = app.globalData.config.outside.delivery.section
      section.forEach(item=>{
        if (item.range[1]>maximum) {
          maximum = item.range[1]
        }
      })
      self.setData({
        maximum: maximum,
        coordinate: app.globalData.config.base.location.coordinate
      })
      self.init()
    }
  },
  methods: {
    init() {
      let self = this
      db.collection('address').where({
        _openid: '{openid}'
      }).get().then(res=>{
        let list = res.data
        let usable = []
        let disable = []
        let selected = null
        let maximum = self.data.maximum
        let coordinate = self.data.coordinate
        list.forEach((item, index) => {
          let temp_coordinate = item.location.coordinate
          item.distance = tools.getDistance(temp_coordinate.latitude, temp_coordinate.longitude, coordinate.coordinates[1], coordinate.coordinates[0])
          if (item.distance < maximum) {
            usable.push(index)
            if (selected==null && item.is_default) {
              selected = index
            }
          } else {
            disable.push(index)
          }
        })
        if (selected==null && usable.length>0) {
          selected = usable[0]
        }
        self.setData({
          list: list,
          usable: usable,
          disable: disable,
          current: selected,
          selected: selected
        })
        if (selected!=null) {
          self.triggerEvent('affirm', list[selected])
        }
      })
    },
    refresh() {
      let self = this
      db.collection('address').where({
        _openid: '{openid}'
      }).get().then(res=>{
        let list = res.data
        let usable = []
        let disable = []
        let selected = self.data.selected
        let maximum = self.data.maximum
        let coordinate = self.data.coordinate
        list.forEach((item, index) => {
          let temp_coordinate = item.location.coordinate
          item.distance = tools.getDistance(temp_coordinate.latitude, temp_coordinate.longitude, coordinate.coordinates[1], coordinate.coordinates[0])
          if (item.distance < maximum) {
            usable.push(index)
            if (selected==null && item.is_default) {
              selected = index
            }
          } else {
            disable.push(index)
            if (selected == index) {
              selected = null
            }
          }
        })
        if (selected==null && usable.length>0) {
          selected = usable[0]
        }
        self.setData({
          list: list,
          usable: usable,
          disable: disable,
          current: selected,
          selected: selected
        })
      })
    },
    tapSlide(e) {
      let self = this
      if (e.detail.index) {
        self.remove(Number(e.currentTarget.dataset.index))
      } else {
        app.addressUpdateCallback = () => {
          self.refresh()
        }
        let item = self.data.list[e.currentTarget.dataset.index]
        app.globalData.temp_data = tools.objCopy(item)
        wx.navigateTo({
          url: '/pages/self/address/update'
        })
      }
    },
    create() {
      let self = this
      app.globalData.temp_list = self.data.list
      app.addressUpdateCallback = () => {
        self.refresh()
      }
      wx.navigateTo({
        url: '/pages/self/address/create',
      })
    },
    remove(index) {
      let self = this
      let item = self.data.list[index]
      wx.showModal({
        title: '操作提示',
        content: '确定要删除当前地址？',
        success(res) {
          if (res.confirm) {
            wx.showLoading({
              title: '正在操作',
              mask: true
            })
            db.collection('address').where({
              _id: item._id,
              openid: '{openid}'
            }).remove().then(res=>{
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              })
              setTimeout(() => {
                self.refresh()
              }, 2000)
            }).catch(err=>{
              wx.showToast({
                title: '系统繁忙',
                icon: 'none',
                duration: 2000
              })
            })
          }
        }
      })
    },
    choose(e) {
      this.setData({
        selected: Number(e.detail.value)
      })
    },
    affirm() {
      let self = this
      self.setData({
        show: false,
        current: self.data.selected
      })
      if (self.data.current==null) {
        self.triggerEvent('affirm', null)
      } else {
        self.triggerEvent('affirm', self.data.list[self.data.current])
      }
    },
    open() {
      this.setData({
        show: true
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})