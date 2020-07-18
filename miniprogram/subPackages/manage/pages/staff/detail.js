const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    detail: null,
    stateOptions: ['离职', '在职'],
    privilegeOptions: [{
      open: false,
      name: '系统后台-用户管理',
      value: 'user'
    },
    {
      open: false,
      name: '系统后台-职员管理',
      value: 'staff',
      children: [{
        name: '添加',
        value: 'staff-create'
      }, {
        name: '修改',
        value: 'staff-update'
      }, {
        name: '删除',
        value: 'staff-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-厨房管理',
      value: 'kitchen',
      children: [{
        name: '添加',
        value: 'kitchen-create'
      }, {
        name: '修改',
        value: 'kitchen-update'
      }, {
        name: '删除',
        value: 'kitchen-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-餐桌管理',
      value: 'table',
      children: [{
        name: '添加',
        value: 'table-create'
      }, {
        name: '修改',
        value: 'table-update'
      }, {
        name: '删除',
        value: 'table-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-栏目管理',
      value: 'column',
      children: [{
        name: '添加',
        value: 'column-create'
      }, {
        name: '修改',
        value: 'column-update'
      }, {
        name: '删除',
        value: 'column-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-菜单管理',
      value: 'menu',
      children: [{
        name: '添加',
        value: 'menu-create'
      }, {
        name: '修改',
        value: 'menu-update'
      }, {
        name: '删除',
        value: 'menu-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-订单管理',
      value: 'order',
      children: [{
        name: '点餐数据',
        value: 'order-inside_data'
      }, {
        name: '点餐打单',
        value: 'order-inside_print'
      }, {
        name: '点餐退款',
        value: 'order-inside_refund'
      }, {
        name: '点餐删除',
        value: 'order-inside_remove'
      }, {
        name: '外卖数据',
        value: 'order-outside_data'
      }, {
        name: '外卖打单',
        value: 'order-outside_print'
      }, {
        name: '外卖退款',
        value: 'order-outside_refund'
      }, {
        name: '外卖删除',
        value: 'order-outside_remove'
      }, {
        name: '订桌数据',
        value: 'order-book_data'
      }, {
        name: '订桌退款',
        value: 'order-book_refund'
      }, {
        name: '订桌删除',
        value: 'order-book_remove'
      }]
    },
    {
      open: false,
      name: '系统后台-打印管理',
      value: 'printer',
      children: [{
        name: '添加',
        value: 'printer-create'
      }, {
        name: '修改',
        value: 'printer-update'
      }, {
        name: '删除',
        value: 'printer-remove'
      }, {
        name: '设置',
        value: 'printer-setting'
      }]
    },
    {
      open: false,
      name: '系统后台-公告管理',
      value: 'notice',
      children: [{
        name: '添加',
        value: 'notice-create'
      }, {
        name: '修改',
        value: 'notice-update'
      }, {
        name: '删除',
        value: 'notice-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-配送记录',
      value: 'delivery',
      children: []
    },
    {
      open: false,
      name: '系统后台-支付记录',
      value: 'payment',
      children: []
    },
    {
      open: false,
      name: '系统后台-反馈管理',
      value: 'feedback',
      children: [{
        name: '删除',
        value: 'feedback-remove'
      }]
    },
    {
      open: false,
      name: '系统后台-统计报表',
      value: 'report'
    },
    {
      open: false,
      name: '系统后台-系统设置',
      value: 'setting',
      children: [{
        name: '基本设置',
        value: 'setting-base'
      }, {
        name: '密码设置',
        value: 'setting-password'
      }, {
        name: '首页设置',
        value: 'setting-home'
      }, {
        name: '点餐设置',
        value: 'setting-inside'
      }, {
        name: '外卖设置',
        value: 'setting-outside'
      }, {
        name: '订桌设置',
        value: 'setting-book'
      }, {
        name: '排队设置',
        value: 'setting-queue'
      }, {
        name: '呼叫设置',
        value: 'setting-invoke'
      }, {
        name: '配送设置',
        value: 'setting-delivery'
      }, {
        name: '积分设置',
        value: 'setting-integral'
      }, {
        name: '菜品属性',
        value: 'setting-attribute'
      }]
    },
    {
      open: false,
      name: '服务中心-切换状态',
      value: 'service_state'
    },
    {
      open: false,
      name: '服务中心-服务功能',
      value: 'service_function',
      children: [{
        name: '点餐',
        value: 'service_function-inside_order'
      }, {
        name: '外卖',
        value: 'service_function-outside_order'
      }, {
        name: '订桌',
        value: 'service_function-book_order'
      }, {
        name: '排队',
        value: 'service_function-queue'
      }, {
        name: '菜品',
        value: 'service_function-menu'
      }, {
        name: '桌况',
        value: 'service_function-table'
      }, {
        name: '配送',
        value: 'service_function-delivery'
      }, {
        name: '积分',
        value: 'service_function-integral'
      }, {
        name: '时价',
        value: 'service_function-price'
      }]
    },
    {
      open: false,
      name: '服务中心-订单处理',
      value: 'service_order',
      children: [{
        name: '点餐-数据',
        value: 'service_order-inside_data'
      }, {
        name: '点餐-打单',
        value: 'service_order-inside_print'
      }, {
        name: '点餐-变更',
        value: 'service_order-inside_modify'
      }, {
        name: '点餐-退款',
        value: 'service_order-inside_refund'
      }, {
        name: '点餐-处理',
        value: 'service_order-inside_handle'
      }, {
        name: '点餐-制作',
        value: 'service_order-inside_make'
      }, {
        name: '点餐-取消',
        value: 'service_order-inside_cancel'
      }, {
        name: '点餐-完成',
        value: 'service_order-inside_finish'
      }, {
        name: '外卖-数据',
        value: 'service_order-outside_data'
      }, {
        name: '外卖-打单',
        value: 'service_order-outside_print'
      }, {
        name: '外卖-变更',
        value: 'service_order-outside_modify'
      }, {
        name: '外卖-退款',
        value: 'service_order-outside_refund'
      }, {
        name: '外卖-处理',
        value: 'service_order-outside_handle'
      }, {
        name: '外卖-制作',
        value: 'service_order-outside_make'
      }, {
        name: '外卖-取消',
        value: 'service_order-outside_cancel'
      }, {
        name: '外卖-完成',
        value: 'service_order-outside_finish'
      }, {
        name: '订桌-数据',
        value: 'service_order-book_data'
      }, {
        name: '订桌-变更',
        value: 'service_order-book_modify'
      }, {
        name: '订桌-退款',
        value: 'service_order-book_refund'
      }, {
        name: '订桌-处理',
        value: 'service_order-book_handle'
      }, {
        name: '订桌-取消',
        value: 'service_order-book_cancel'
      }, {
        name: '订桌-过期',
        value: 'service_order-book_overdue'
      }, {
        name: '订桌-完成',
        value: 'service_order-book_finish'
      }]
    },
    {
      open: false,
      name: '服务中心-餐桌呼叫',
      value: 'service_invoke'
    },
    {
      open: false,
      name: '服务中心-通知配送',
      value: 'service_delivery'
    }
  ],
    userInfo: null
  },
  onLoad(options) {
    let self = this
    let detail = app.globalData.temp_data
    self.setData({
      detail: detail
    })
    if (detail.openid != '') {
      db.collection('user').where({
        openid: detail.openid
      }).get().then(res => {
        if (res.data.length > 0) {
          self.setData({
            userInfo: res.data[0]
          })
        }
      })
    }
  },
  callPhone(e) {
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.value
    })
  }
})