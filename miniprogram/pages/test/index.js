
Page({
  data: {
  },
  onLoad: function (e) {
    wx.cloud.callFunction({
      name: 'payment',
      data: {
        action: 'getPayParams',
        data: {
          order_sn: new Date().getTime(),
          total_fee: 100
        }
      },
    }).then(res => {
      console.log(res)
    }).catch(console.error)
  }
})