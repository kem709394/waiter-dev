const app = getApp()

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
    refresher: {
      type: Boolean,
      value: false
    }
  },
  data: {
    show: false,
    config: null,
    statusBarHeight: 0,
    customBarHeight: 0,
    menuButton: null,
    headerHeight: 0,
    footerHeight: 0,
    privilege: [],
    floatBall: [],
    current: null,
    scrolltop: 0,
    triggered: false
  },
  lifetimes: {
    attached() {
      let self = this
      let pages = getCurrentPages()
      let current = pages[pages.length - 1]
      let floatBall = [0,0]
      if (app.globalData.floatBall) {
        floatBall = app.globalData.floatBall
      } else {
        let windowWidth = app.globalData.windowWidth
        let windowHeight = app.globalData.windowHeight
        floatBall = [windowWidth/5*4,windowHeight/5*4,]
      }
      self.setData({
        config: app.globalData.config,
        statusBarHeight: app.globalData.statusBarHeight,
        customBarHeight: app.globalData.customBarHeight,
        menuButton: app.globalData.menuButton,
        privilege: app.globalData.identity.staff.privilege,
        floatBall: floatBall,
        current: current
      })
      let query1 = wx.createSelectorQuery()
      query1.select('#header').boundingClientRect()
      query1.exec((res) => {
        if (res[0]) {
          self.setData({
            headerHeight: res[0].height
          })
        }
      })
      let query2 = wx.createSelectorQuery()
      query2.select('#footer').boundingClientRect()
      query2.exec((res) => {
        if (res[0]) {
          self.setData({
            footerHeight: res[0].height
          })
        }
      })
    }
  },
  methods: {
    back() {
      wx.navigateBack()
    },
    open() {
      this.setData({
        show: true
      })
    },
    close() {
      this.setData({
        show: false
      })
    },
    redirect(e) {
      let path = e.currentTarget.dataset.path
      if (this.data.current == path){
        this.setData({
          show: false
        })
        this.triggerEvent('hide')
      } else {
        wx.redirectTo({
          url: path + '?title=' + e.currentTarget.dataset.title
        })
      }
    },
    logout() {
      app.globalData.identity.credit = false
      wx.setStorage({ key: 'identity', data: app.globalData.identity })
      wx.navigateBack()
    },
    worktable() {
      wx.redirectTo({
        url: '/subPackages/worktable/pages/index/index'
      })
    },
    marketing() {
      wx.redirectTo({
        url: '/subPackages/marketing/pages/manage/index/index'
      })
    },
    refresh() {
      let self = this
      setTimeout(()=>{
        self.setData({
          triggered: false
        })
        self.triggerEvent('refresh')
      },1000)
    },
    scrolltolower() {
      this.triggerEvent('lower')
    },
    touchTop() {
      let self = this
      if (self.data.clickTime) {
        if (new Date().getTime() - self.data.clickTime < 300) {
          self.setData({
            scrolltop: 0
          })
          self.triggerEvent('totop')
        }
      }
      self.data.clickTime = new Date().getTime()
    },
    ballMove(e) {
      let point = e.touches[0]
      this.setData({
        floatBall: [point.pageX,point.pageY]
      })
      app.globalData.floatBall = [point.pageX,point.pageY]
    }
  }
})
