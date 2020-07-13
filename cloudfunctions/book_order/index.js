const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const moment = require('moment')

//订桌服务功能
class Order {
  constructor() {
    this.user = null
    this.staff = null
    this.member = null
    this.config = {}
  }

  static getInstace() {
    if (!Order.instace) {
      Order.instace = new Order()
    }
    return Order.instace
  }

  genOrderSn() {
    let sn = moment().format('YYYYMMDDHHmmssSSS')
    let random = ('00' + Math.floor(Math.random() * 1000)).substr(-3)
    return sn + random
  }

  async filterUser(openid) {
    let self = this
    let res = await db.collection('user').where({
      openid: openid
    }).get()
    if (res.data.length) {
      self.user = res.data[0]
    } else {
      throw new Error('error!')
    }
  }

  async filterStaff(openid) {
    let self = this
    let res = await db.collection('staff').where({
      is_deleted: false,
      openid: openid
    }).get()
    if (res.data.length) {
      self.staff = res.data[0]
    } else {
      throw new Error('error!')
    }
  }

  async getConfig() {
    let self = this
    let res = await db.collection('config').get()
    res.data.forEach(item => {
      self.config[item._id] = item.content
    })
  }

  async wechat_notice(order_sn) {
    try { 
      let self = this
      let config = self.config
      let res = await db.collection('staff').where({
        is_deleted: false,
        state: 1
      }).limit(1000).get()
      for(let i in res.data) {
        let staff = res.data[i]
        if (staff.openid && staff.subscribe && staff.subscribe.includes('order')) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: staff.openid,
              page: 'pages/index/index',
              data: {
                character_string1: {
                  value: order_sn
                },
                phrase3: {
                  value: '订桌订单'
                },
                date4: {
                  value: moment().format('YYYY-MM-DD HH:mm')
                }
              },
              templateId: config.base.notify.template.order
            })
          } catch (err) { }
        }
      }
    } catch (err) { }
  }

  async print_notice(order) {
    try {
      let self = this
      let config = self.config
      for (let i = 0; i < config.book.voucher.printer.length; i++) {
        let content = `订桌通知<audio>有人预定餐桌请及时处理,5,0</audio>`
        try { 
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: config.book.voucher.printer[i].id,
              data: {
                originId: order.order_sn,
                content: content
              }
            }
          })
        } catch (err) { }
      }
    } catch (err) {}
  }

  async print_receipt(order) {
    try {
      let self = this
      let config = self.config
      let table = ''
      order.table.forEach(item => {
        table = table + item.name + ' '
      })
      let page_text = `<FS2><center>**${config.base.name}**</center></FS2><FB><center>电话：${config.base.telephone}</center></FB>`
      page_text += `<FS2><center>订桌回执</center></FS2>`
      page_text += `<FB>订单编号:${order.order_sn}</FB>\r\n`
      page_text += `<FB>下单时间:${moment().format('YYYY-MM-DD HH:mm')}</FB>\r\n`
      page_text += `<FB>使用人数:${order.amount}</FB>\r\n`
      page_text += `<FB>使用日期:${order.date_string}</FB>\r\n`
      page_text += `<FB>使用时间:${order.time_range[0]}-${order.time_range[1]}</FB>\r\n`
      if (order.remark != '') {
        page_text += `<FB>备注内容:${order.remark}</FB>\r\n`
      }
      if (order.earnest_money) {
        page_text += `<FB>预付定金:${order.earnest_money/100}元</FB>\r\n`
      }
      page_text += `<FB>保留餐桌:${table}</FB>\r\n`
      page_text += `<FB>操作时间:${moment().format('YYYY-MM-DD HH:mm')}</FB>\r\n`
      page_text += `<FB>温馨提示:${config.book.warn_text}</FB>\r\n`
      for (let i = 0; i < config.book.voucher.printer.length; i++) {
        let content = `<MN>${config.book.voucher.printer[i].page}</MN>`
        content += page_text
        content += `<FS2><center>****** 完 ******</center></FS2>`
        content += `<center>技术:白马为科技</center><audio>打印订桌回执,5,0</audio>`
        try { 
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: config.book.voucher.printer[i].id,
              data: {
                originId: order.order_sn,
                content: content
              }
            }
          })
        } catch (err) { }
      }
    } catch (err) {}
  }

  async create_active(data) {
    try {
      let self = this
      let user = self.user
      let config = self.config
      let earnest_money = config.book.earnest_money
      let order = {
        openid: self.user.openid,
        owner_uid: self.user._id,
        order_sn: self.genOrderSn(),
        contacts: data.contacts,
        date_string: data.date_string,
        time_range: data.time_range,
        amount: data.amount,
        remark: data.remark,
        is_deleted: false,
        state: 0,
        earnest_money: earnest_money,
        total_money: earnest_money,
        payable_money: earnest_money,
        payment_money: earnest_money,
        refund_state: 0,
        refund_money: 0,
        create_uid: user._id,
        create_time: db.serverDate()
      }
      let res = await db.collection('book_order').add({
        data: order
      })
      if (order.state == 10) {
        if (config.book.voucher.active) {
          await self.print_notice(order)
        }
        if (config.base.notify.active) {
          await self.wechat_notice(order.order_sn)
        }
      }
      return {
        errcode: 0,
        order: {
          order_id: res._id,
          order_sn: order.order_sn
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async create_passive(data, print) {
    try {
      let self = this
      let staff = self.staff
      let config = self.config
      let order = {
        order_sn: self.genOrderSn(),
        contacts: data.contacts,
        date_string: data.date_string,
        time_range: data.time_range,
        amount: data.amount,
        remark: data.remark,
        is_deleted: false,
        state: 11,
        earnest_money: 0,
        total_money: 0,
        payable_money: 0,
        payment_money: 0,
        refund_state: 0,
        refund_money: 0,
        table: data.table,
        create_sid: staff._id,
        create_time: db.serverDate(),
        receive_sid: staff._id,
        receive_time: db.serverDate()
      }
      order.table_ids = data.table.map(item => {
        return item.value
      })
      let res = await db.collection('book_order').add({
        data: order
      })
      if (config.book.voucher.active && print) {
        await self.print_receipt(order)
      }
      return {
        errcode: 0,
        order: {
          order_id: res._id,
          order_sn: order.order_sn
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async cancel_active(id, data) {
    try {
      let self = this
      let user = self.user
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.openid == user.openid && order.state == 10) {
        let update = {
          state: 41,
          cancel_note: data.note,
          cancel_time: db.serverDate(),
          cancel_uid: user._id
        }
        if (order.payment_money > 0) {
          const transaction = await db.startTransaction()
          res = await transaction.collection('payment_refund').add({
            data: {
              openid: order.openid,
              order_id: order._id,
              order_type: 'book',
              payment_id: order.payment_id,
              note: '取消订单',
              money: order.payment_money,
              state: 0,
              start_time: db.serverDate()
            }
          })
          update.refund_state = 1
          update.refund_money =  order.payment_money
          await transaction.collection('book_order').doc(order._id).update({
            data: update
          })
          res = await cloud.callFunction({
            name: 'payment',
            data: {
              action: 'refund',
              trade_no: order.payment_id,
              refund_no: res._id,
              total_fee: order.payment_money, 
              refund_fee: order.payment_money
            }
          })
          if (res.result.errcode == 0) {
            await transaction.commit()
            return {
              errcode: 0
            }
          } else {
            return {
              errcode: -1
            }
          }
        } else {
          await db.collection('book_order').doc(order._id).update({
            data: update
          })
          return {
            errcode: 0
          }
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async cancel_passive(id, data) {
    try {
      let self = this
      let staff = self.staff
      let config = self.config
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        await db.collection('book_order').doc(order._id).update({
          data:  {
            state: 42,
            cancel_sid: staff._id,
            cancel_note: data.note,
            cancel_time: db.serverDate()
          }
        })
        if (order.openid && config.book.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/book/detail?id=' + order._id,
              data: {
                character_string1: {
                  value: order.order_sn
                },
                date2: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing5: {
                  value: data.note
                },
                thing10: {
                  value: '如有疑问请联系我们!'
                }
              },
              templateId: config.book.notify.template.cancel
            })
          } catch (err) {}
        }
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async remove(id) {
    try {
      let self = this
      let staff = self.staff
      await db.collection('book_order').doc(id).update({
        data: {
          is_deleted: true,
          remove_sid: staff._id,
          remove_time: db.serverDate()
        }
      })
      return {
        errcode: 0
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async modify(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        data.modify_sid = staff._id
        data.modify_time = db.serverDate()
        data.table_ids = data.table.map(item => {
          return item.value
        })
        await db.collection('book_order').doc(order._id).update({
          data: data
        })
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async receive(id, data) {
    try {
      let self = this
      let staff = self.staff
      let config = self.config
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.state == 10) {
        await db.collection('book_order').doc(order._id).update({
          data: {
            state: 11,
            receive_sid: staff._id,
            receive_time: db.serverDate(),
            receive_note: data.note,
            date_string: data.date_string,
            time_range: data.time_range,
            table: data.table,
            table_ids: data.table.map(item => {
              return item.value
            })
          }
        })
        if (config.book.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/book/detail?id=' + order._id,
              data: {
                number11: {
                  value: order.order_sn
                },
                phrase10: {
                  value: '预定成功'
                },
                phrase9: {
                  value: '订桌订单'
                },
                date4: {
                  value: moment().format('YYYY-MM-DD HH:mm')
                },
                thing17: {
                  value: '请提前到店签到!'
                }
              },
              templateId: config.book.notify.template.success
            })
          } catch (err) {}
        }
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async overdue(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        await db.collection('book_order').doc(order._id).update({
          data: {
            state: 6,
            overdue_sid: staff._id,
            overdue_note: data.note,
            overdue_time: db.serverDate()
          }
        })
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async finish(id) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        await db.collection('book_order').doc(order._id).update({
          data: {
            state: 5,
            finish_sid: staff._id,
            finish_time: db.serverDate()
          }
        })
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '非法操作'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async refund(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('book_order').doc(id).get()
      let order = res.data
      if (order.refund_state == 1) {
        return {
          errcode: -1,
          errmsg: '有退款未完成'
        }
      }
      if (order.payment_money-order.refund_money < data.money) {
        return {
          errcode: -1,
          errmsg: '超出退款金额'
        }
      } else {
        const transaction = await db.startTransaction()
        res = await transaction.collection('payment_refund').add({
          data: {
            openid: order.openid,
            order_id: order._id,
            order_type: 'book',
            payment_id: order.payment_id,
            note: data.note,
            money: data.money,
            state: 0,
            refund_sid: staff._id,
            start_time: db.serverDate()
          }
        })
        await transaction.collection('book_order').doc(order._id).update({
          data: {
            refund_state: 1,
            refund_money: _.inc(data.money)
          }
        })
        res = await cloud.callFunction({
          name: 'payment',
          data: {
            action: 'refund',
            trade_no: order.payment_id,
            refund_no: res._id,
            total_fee: order.payment_money, 
            refund_fee: data.money
          }
        })
        if (res.result.errcode == 0) {
          await transaction.commit()
          return {
            errcode: 0
          }
        } else {
          return {
            errcode: -1
          }
        }
      }
    } catch (err) {
      return {
        errcode: -1,
        errmsg: '操作失败'
      }
    }
  }

  async payment(order_id) {
    let res = await db.collection('book_order').doc(order_id).get()
    let order = res.data
    let money = order.payable_money
    res = await db.collection('payment').add({
      data: {
        openid: order.openid,
        order_id: order._id,
        order_type: 'book',
        type: 'wxpay',
        state: 0,
        money: money,
        start_time: db.serverDate()
      }
    })
    let payment_id = res._id
    res = await cloud.callFunction({
      name: 'payment',
      data: {
        action: 'unified',
        trade_no: payment_id, 
        body: '预付定金', 
        totalFee: money, 
        attach: 'book'
      }
    })
    if (res.result.errcode == 0) {
      return {
        errcode: 0,
        payment_id: payment_id, 
        payment: res.result.payment
      }
    }
    return {
      errcode: -1,
      errmsg: '操作失败'
    }
  }

  async payment_success(payment_id) {
    try {
      let res = await cloud.callFunction({
        name: 'payment',
        data: {
          action: 'query',
          trade_no: payment_id
        }
      })
      if (res.result.errcode == 0) {
        const transaction = await db.startTransaction()
        res = await db.collection('payment').doc(payment_id).get()
        let payment = res.data
        if (payment.state==0) {
          await transaction.collection('book_order').doc(payment.order_id).update({
            data: {
              state: 10,
              payment_id: payment._id,
              payment_type: payment.type,
              payment_money: payment.money
            }
          })
          await transaction.collection('payment').doc(payment_id).update({
            data: {
              state: 1,
              end_time: db.serverDate()
            }
          })
          await transaction.commit()
          if (self.config.book.voucher.active) {
            await self.print_notice(order)
          }
          if (self.config.base.notify.active) {
            await self.wechat_notice(order.order_sn)
          }
        }
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

}

exports.main = async(event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const instance = Order.getInstace()
    switch (event.action) {
      case 'create_active':
        await instance.filterUser(wxContext.OPENID)
        await instance.getConfig()
        return await instance.create_active(event.data)
      case 'create_passive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.create_passive(event.data, event.print)
      case 'cancel_active':
        await instance.filterUser(wxContext.OPENID)
        return await instance.cancel_active(event.id, event.data)
      case 'cancel_passive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.cancel_passive(event.id, event.data)
      case 'remove':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.remove(event.id)
      case 'modify':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.modify(event.id, event.data)
      case 'receive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()  
        return await instance.receive(event.id, event.data)
      case 'overdue':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.overdue(event.id, event.data)
      case 'finish':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.finish(event.id)
      case 'refund':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.refund(event.id,event.data)   
      case 'payment':
        return await instance.payment(event.id)  
      case 'payment_success':
        await instance.getConfig()
        return await instance.payment_success(event.payment_id) 
      default:
        return {
          errcode: -2,
          errmsg: '非法操作'
        }
    }
  } catch (e) {
    return {
      errcode: -3,
      errmsg: '操作异常'
    }
  }
}