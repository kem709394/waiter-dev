const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const moment = require('moment')

//菜品统计
class Menu {

  constructor() {
  }

  static getInstace() {
    if (!Menu.instace) {
      Menu.instace = new Menu()
    }
    return Menu.instace
  }

  async stat_order_inside() {
    let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
    let res = await db.collection('inside_order')
      .aggregate()
      .match({
        is_deleted: false,
        state: 5
      })
      .addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        formatDate: tempString
      })
      .unwind('$menu_list')
      .group({
        _id: {
          mid: '$menu_list.id',
          date: '$formatDate'
        },
        amount: $.sum('$menu_list.amount')
      })
      .limit(1000)
      .end()
    let list = res.list
    if (list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        await db.collection('menu_order_stat').add({
          data: {
            date_string: tempString,
            mid: item._id.mid,
            type: 'inside',
            amount: item.amount,
            stat_time: db.serverDate()
          }
        })
      }
    }
  }

  async stat_order_outside() {
    let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
    let res = await db.collection('outside_order')
      .aggregate()
      .match({
        is_deleted: false,
        state: 5
      })
      .addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        formatDate: tempString
      })
      .unwind('$menu_list')
      .group({
        _id: {
          mid: '$menu_list.id',
          date: '$formatDate'
        },
        amount: $.sum('$menu_list.amount')
      })
      .limit(1000)
      .end()
    let list = res.list
    if (list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        await db.collection('menu_order_stat').add({
          data: {
            date_string: tempString,
            mid: item._id.mid,
            type: 'outside',
            amount: item.amount,
            stat_time: db.serverDate()
          }
        })
      }
    }
  }

  async sync_stat_order_inside(days) {
    let temp = moment()
    for (let i = days; i > 0; i--) {
      let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
      let res = await db.collection('inside_order')
        .aggregate()
        .match({
          is_deleted: false,
          state: 5
        })
        .addFields({
          formatDate: $.dateToString({
            date: '$finish_time',
            format: '%Y-%m-%d',
            timezone: 'Asia/Shanghai'
          })
        })
        .match({
          formatDate: tempString
        })
        .unwind('$menu_list')
        .group({
          _id: {
            mid: '$menu_list.id',
            date: '$formatDate'
          },
          amount: $.sum('$menu_list.amount')
        })
        .limit(1000)
        .end()
      let list = res.list
      if (list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          let item = list[i]
          res = await db.collection('menu_order_stat').where({
            date_string: tempString,
            type: 'inside',
            mid: item._id.mid
          }).get()
          if (res.data.length > 0) {
            await db.collection('menu_order_stat').doc(res.data[0]._id).update({
              data: {
                amount: item.amount,
                stat_time: db.serverDate()
              }
            })
          } else {
            await db.collection('menu_order_stat').add({
              data: {
                date_string: tempString,
                mid: item._id.mid,
                type: 'inside',
                amount: item.amount,
                stat_time: db.serverDate()
              }
            })
          }
        }
      }
    }
    return {
      errcode: 0
    }
  }

  async sync_stat_order_outside(days) {
    let temp = moment()
    for (let i = days; i > 0; i--) {
      let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
      let res = await db.collection('outside_order')
        .aggregate()
        .match({
          is_deleted: false,
          state: 5
        })
        .addFields({
          formatDate: $.dateToString({
            date: '$finish_time',
            format: '%Y-%m-%d',
            timezone: 'Asia/Shanghai'
          })
        })
        .match({
          formatDate: tempString
        })
        .unwind('$menu_list')
        .group({
          _id: {
            mid: '$menu_list.id',
            date: '$formatDate'
          },
          amount: $.sum('$menu_list.amount')
        })
        .limit(1000)
        .end()
      let list = res.list
      if (list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          let item = list[i]
          res = await db.collection('menu_order_stat').where({
            date_string: tempString,
            type: 'outside',
            mid: item._id.mid
          }).get()
          if (res.data.length > 0) {
            await db.collection('menu_order_stat').doc(res.data[0]._id).update({
              data: {
                amount: item.amount,
                stat_time: db.serverDate()
              }
            })
          } else {
            await db.collection('menu_order_stat').add({
              data: {
                date_string: tempString,
                mid: item._id.mid,
                type: 'outside',
                amount: item.amount,
                stat_time: db.serverDate()
              }
            })
          }
        }
      }
    }
    return {
      errcode: 0
    }
  }

}

exports.main = async(event, context) => {
  try {
    const instance = Menu.getInstace()
    if (event.action) {
      switch (event.action) {
        case 'sync_stat_order':
          return await instance.sync_stat_order_inside(event.days)
        case 'sync_stat_order':
          return await instance.sync_stat_order_outside(event.days) 
        default:
          return {
            errcode: -2,
            errmsg: '非法操作'
          }
      }
    } else {
      await instance.stat_order_inside()
      await instance.stat_order_outside()
    }
  } catch (e) {
    return {
      errcode: -3,
      errmsg: '操作异常'
    }
  }
}