const app = getApp()

Page({
  data: {
    detail: {},
    markers: []
  },
  onLoad(options) {
    let detail = app.globalData.temp_data
    let marker = {
      title: detail.location.name,
      latitude: detail.location.coordinate.coordinates[1],
      longitude: detail.location.coordinate.coordinates[0]
    }
    this.setData({
      detail: detail,
      markers: [marker]
    })
  }
})