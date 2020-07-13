const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const moment = require('moment')

//订单定时任务
async function clear_expire_book() {
  let date = moment.utc().subtract(1, 'hours')
  await db.collection('book_order').where({
    is_deleted: false,
    state: 0,
    create_time: _.lt(date.toDate())
  }).update({
    data: {
      is_deleted: true
    }
  })
}

async function clear_expire_inside() {
  let date = moment.utc().subtract(1, 'hours')
  await db.collection('inside_order').where({
    is_deleted: false,
    state: 0,
    create_time: _.lt(date.toDate())
  }).update({
    data: {
      is_deleted: true
    }
  })
}

async function clear_expire_outside() {
  let date = moment.utc().subtract(1, 'hours')
  await db.collection('outside_order').where({
    is_deleted: false,
    state: 0,
    create_time: _.lt(date.toDate())
  }).update({
    data: {
      is_deleted: true
    }
  })
}

async function stat_order_book() {
  let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
  let res = await db.collection('book_order')
    .aggregate()
    .addFields({
      formatDate: $.dateToString({
        date: '$finish_time',
        format: '%Y-%m-%d',
        timezone: 'Asia/Shanghai'
      })
    })
    .match({
      is_deleted: false,
      state: 5,
      formatDate: tempString
    })
    .group({
      _id: '$formatDate',
      amount: $.sum(1)
    })
    .end()
  let list = res.list
  if (list.length > 0) {
    for (let i = 0; i < list.length; i++) {
      let item = list[i]
      await db.collection('order_stat').add({
        data: {
          date_string: tempString,
          type: 'book',
          amount: item.amount,
          money: 0,
          stat_time: db.serverDate()
        }
      })
    }
  }
}

async function sync_stat_order_book(days) {
  let temp = moment()
  for (let i = days; i > 0; i--) {
    let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
    let res = await db.collection('book_order')
      .aggregate()
      .addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        is_deleted: false,
        state: 5,
        formatDate: tempString
      })
      .group({
        _id: '$formatDate',
        amount: $.sum(1)
      })
      .end()
    let list = res.list
    if (list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        res = await db.collection('order_stat').where({
          date_string: tempString,
          type: 'book'
        }).get()
        if (res.data.length > 0) {
          await db.collection('order_stat').doc(res.data[0]._id).update({
            data: {
              amount: item.amount,
              stat_time: db.serverDate()
            }
          })
        } else {
          await db.collection('order_stat').add({
            data: {
              date_string: tempString,
              type: 'book',
              amount: item.amount,
              money: 0,
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

async function stat_order_inside() {
  let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
  let res = await db.collection('inside_order')
    .aggregate()
    .addFields({
      formatDate: $.dateToString({
        date: '$finish_time',
        format: '%Y-%m-%d',
        timezone: 'Asia/Shanghai'
      })
    })
    .match({
      is_deleted: false,
      state: 5,
      formatDate: tempString
    })
    .group({
      _id: '$formatDate',
      amount: $.sum(1),
      money: $.sum('$payable_money')
    })
    .end()
  let list = res.list
  if (list.length > 0) {
    for (let i = 0; i < list.length; i++) {
      let item = list[i]
      await db.collection('order_stat').add({
        data: {
          date_string: tempString,
          type: 'inside',
          amount: item.amount,
          money: item.money,
          stat_time: db.serverDate()
        }
      })
    }
  }
}

async function sync_stat_order_inside(days) {
  let temp = moment()
  for (let i = days; i > 0; i--) {
    let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
    let res = await db.collection('inside_order')
      .aggregate()
      .addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        is_deleted: false,
        state: 5,
        formatDate: tempString
      })
      .group({
        _id: '$formatDate',
        amount: $.sum(1),
        money: $.sum('$payable_money')
      })
      .end()
    let list = res.list
    if (list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        res = await db.collection('order_stat').where({
          date_string: tempString,
          type: 'inside'
        }).get()
        if (res.data.length > 0) {
          await db.collection('order_stat').doc(res.data[0]._id).update({
            data: {
              amount: item.amount,
              money: item.money,
              stat_time: db.serverDate()
            }
          })
        } else {
          await db.collection('order_stat').add({
            data: {
              date_string: tempString,
              type: 'inside',
              amount: item.amount,
              money: item.money,
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

async function stat_order_outside() {
  let tempString = moment().subtract(1, 'days').format('YYYY-MM-DD')
  let res = await db.collection('outside_order')
    .aggregate()
    .addFields({
      formatDate: $.dateToString({
        date: '$finish_time',
        format: '%Y-%m-%d',
        timezone: 'Asia/Shanghai'
      })
    })
    .match({
      is_deleted: false,
      state: 5,
      formatDate: tempString
    })
    .group({
      _id: '$formatDate',
      amount: $.sum(1),
      money: $.sum('$payable_money')
    })
    .end()
  let list = res.list
  if (list.length > 0) {
    for (let i = 0; i < list.length; i++) {
      let item = list[i]
      await db.collection('order_stat').add({
        data: {
          date_string: tempString,
          type: 'outside',
          amount: item.amount,
          money: item.money,
          stat_time: db.serverDate()
        }
      })
    }
  }
}

async function sync_stat_order_outside(days) {
  let temp = moment()
  for (let i = days; i > 0; i--) {
    let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
    let res = await db.collection('outside_order')
      .aggregate()
      .addFields({
        formatDate: $.dateToString({
          date: '$finish_time',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .match({
        is_deleted: false,
        state: 5,
        formatDate: tempString
      })
      .group({
        _id: '$formatDate',
        amount: $.sum(1),
        money: $.sum('$payable_money')
      })
      .end()
    let list = res.list
    if (list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i]
        res = await db.collection('order_stat').where({
          date_string: tempString,
          type: 'outside'
        }).get()
        if (res.data.length > 0) {
          await db.collection('order_stat').doc(res.data[0]._id).update({
            data: {
              amount: item.amount,
              money: item.money,
              stat_time: db.serverDate()
            }
          })
        } else {
          await db.collection('order_stat').add({
            data: {
              date_string: tempString,
              type: 'outside',
              amount: item.amount,
              money: item.money,
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

exports.main = async(event, context) => {
  try {
    if (event.action) {
      switch (event.action) {
        case 'sync_stat_order_book':
          return await sync_stat_order_book(event.days)
        case 'sync_stat_order_inside':
          return await sync_stat_order_inside(event.days)
        case 'sync_stat_order_outside':
          return await sync_stat_order_outside(event.days)
        default:
          return {
            errcode: -2,
            errmsg: '非法操作'
          }
      }
    } else {
      await clear_expire_book()
      await clear_expire_inside()
      await clear_expire_outside()
      let current = moment()
      if (current.minute()==0) {
        switch (current.hour()) {
          case 1:
            await stat_order_book()
            break
          case 2:
            await stat_order_inside()
            break
          case 3:
            await stat_order_outside()
        }
      }
    }
  } catch (e) {}
}