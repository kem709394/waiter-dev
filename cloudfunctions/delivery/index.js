const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const moment = require('moment')

//配送服务功能
class Delivery {
  constructor() {
    this.staff = null
    this.config = {}
  }

  static getInstace() {
    if (!Delivery.instace) {
      Delivery.instace = new Delivery()
    }
    return Delivery.instace
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

  async receive(order_id) {
    try {
      let self = this
      let staff = self.staff
      let config = self.config
      const transaction = await db.startTransaction()
      let res = await transaction.collection('outside_order').doc(order_id).get()
      let order = res.data
      if (!order.is_deleted && order.state>10 && order.state<20 && order.delivery_state<1) {
        res = await transaction.collection('delivery').add({
          data: {
            order_id: order._id,
            payable_money: order.payable_money,
            delivery_money: order.delivery_money,
            state: 1,
            delivery_sid: staff._id,
            delivery_time: db.serverDate()
          }
        })
        await transaction.collection('outside_order').doc(order._id).update({
          data: {
            state: 13,
            delivery_id: res._id,
            delivery_state: 1
          }
        })
        await transaction.commit()
        if (order.openid && order.delivery_state==0 && config.outside.delivery.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/outside/detail?id=' + order._id,
              data: {
                character_string2: {
                  value: order.order_sn
                },
                time4: {
                  value: moment().format('YYYY-MM-DD HH:mm')
                },
                phone_number3: {
                  value: staff.mobile
                },
                thing5: {
                  value: '商家配送'
                }
              },
              templateId: config.outside.delivery.notify.template.sendout
            })
          } catch (err) { }
        }
        return {
          errcode: 0,
          id: res._id
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

  async retreat(id, note) {
    try {
      const transaction = await db.startTransaction()
      let res = await transaction.collection('delivery').doc(id).get()
      let delivery = res.data
      if (delivery.state==1) {
        await transaction.collection('delivery').doc(id).update({
          data: {
            state: 3,
            cancel_note: note,
            cancel_time: db.serverDate()
          }
        })
        await transaction.collection('outside_order').doc(delivery.order_id).update({
          data: {
            delivery_state: -1
          }
        })
        await transaction.commit()
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
      let config = self.config
      let res = await db.collection('delivery').doc(id).get()
      let delivery = res.data
      if (delivery.state==1) {
        res = await db.collection('outside_order').doc(delivery.order_id).get()
        let order = res.data
        const transaction = await db.startTransaction()
        await transaction.collection('delivery').doc(id).update({
          data: {
            state: 2,
            finish_time: db.serverDate()
          }
        })
        await transaction.collection('outside_order').doc(delivery.order_id).update({
          data: {
            delivery_state: 2,
            state: 5,
            finish_sid: staff._id,
            finish_time: db.serverDate()
          }
        })
        await transaction.commit()
        if (order.openid) {
          if (config.outside.notify.active) {
            try {
              await cloud.openapi.subscribeMessage.send({
                touser: order.openid,
                page: 'pages/order/outside/detail?id=' + order._id,
                data: {
                  character_string2: {
                    value: order.order_sn
                  },
                  time8: {
                    value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                  },
                  thing5: {
                    value: '欢迎再次光临！'
                  }
                },
                templateId: config.outside.notify.template.finish
              })
            } catch (err) { }
          }
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

  async wechat_notify(staff_id) {
    try {
      let self = this
      let res = await db.collection('staff').doc(staff_id).get()
      await cloud.openapi.subscribeMessage.send({
        touser: res.data.openid,
        page: 'pages/index/index',
        data: {
          thing1: {
            value: self.config.base.name
          },
          date2: {
            value: moment().format('YYYY-MM-DD HH:mm')
          },
          thing3: {
            value: '请尽快过来领取'
          }
        },
        templateId: self.config.outside.delivery.notify.template.receive
      })
      await db.collection('staff').doc(staff_id).update({
        data: {
          remain_delivery_notify: _.inc(-1)
        }
      })
      return {
        errcode: 0
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async stat_order_task() {
    let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
    let res = await db.collection('delivery')
      .aggregate()
      .match({
        state: 2
      })
      .addFields({
        formatDate: $.dateToString({
          date: '$delivery_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        formatDate: tempString
      })
      .group({
        _id: {
          sid: '$delivery_sid',
          date_string: '$formatDate'
        },
        amount: $.sum(1),
        payable_money: $.sum('$payable_money'),
        delivery_money: $.sum('$delivery_money')
      }).limit(1000).end()
    let list = res.list
    if (res.list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        await db.collection('delivery_stat').add({
          data: {
            date_string: tempString,
            delivery_sid: item._id.sid,
            amount: item.amount,
            payable_money: item.payable_money,
            delivery_money: item.delivery_money,
            stat_time: db.serverDate()
          }
        })
      }
    }
  }

  async sync_stat_order(days) {
    let temp = moment()
    for (let i = days; i > 0; i--) {
      let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
      let res = await db.collection('delivery')
        .aggregate()
        .match({
          state: 2
        })
        .addFields({
          formatDate: $.dateToString({
            date: '$delivery_time',
            format: '%Y-%m-%d',
            timezone: 'Asia/Shanghai'
          })
        })
        .match({
          formatDate: tempString
        })
        .group({
          _id: {
            sid: '$delivery_sid',
            date_string: '$formatDate'
          },
          amount: $.sum(1),
          payable_money: $.sum('$payable_money'),
          delivery_money: $.sum('$delivery_money')
        }).limit(1000).end()
      let list = res.list
      if (res.list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          let item = list[i]
          res = await db.collection('delivery_stat').where({
            date_string: tempString,
            delivery_sid: item._id.sid
          }).get()
          if (res.data.length > 0) {
            await db.collection('delivery_stat').doc(res.data[0]._id).update({
              data: {
                amount: item.amount,
                payable_money: item.payable_money,
                delivery_money: item.delivery_money,
                stat_time: db.serverDate()
              }
            })
          } else {
            await db.collection('delivery_stat').add({
              data: {
                date_string: tempString,
                delivery_sid: item._id.sid,
                amount: item.amount,
                payable_money: item.payable_money,
                delivery_money: item.delivery_money,
                stat_time: db.serverDate()
              }
            })
          }
        }
      }
    }
  }

  async clear_delivery_notify() {
    await db.collection('staff').where({
      is_deleted: false
    }).update({
      data: {
        remain_delivery_notify: 0
      }
    })
  }
}

exports.main = async (event, context) => {
  try {
    const instance = Delivery.getInstace()
    if (event.action) {
      const wxContext = cloud.getWXContext()
      instance.filterStaff(wxContext.OPENID)
      switch (event.action) {
        case 'receive':
          await instance.getConfig()
          return await instance.receive(event.order_id)
        case 'retreat':
          return await instance.retreat(event.id, event.note)
        case 'finish':
          await instance.getConfig()
          return await instance.finish(event.id)
        case 'wechat_notify':
          await instance.getConfig()
          return await instance.wechat_notify(event.staff_id)    
        default:
          return {
            errcode: -2,
            errmsg: '非法操作'
          }
      }
    } else {
      await instance.stat_order_task()
      await instance.clear_delivery_notify()
    }
  } catch (e) {
    return {
      errcode: -3,
      errmsg: '操作异常'
    }
  }
}