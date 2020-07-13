const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const moment = require('moment')

// 退款检测任务，由于微信提供的接口有问题，暂时停用
async function check_refund(refund) {
  try {
    let res = await cloud.callFunction({
      name: 'payment',
      data: {
        action: 'query_refund',
        refund_no: refund._id
      }
    })
    if (res.result.errcode == 0) {
      let refund_status = res.result.refund_status
      if (refund_status=='PROCESSING') {
        let valid_time = moment(refund.start_time).add(5, 'days')
        if (moment().isAfter(valid_time)) {
          const transaction = await db.startTransaction()
          await transaction.collection('payment_refund').doc(refund._id).update({
            data: {
              state: 3
            }
          })
          await transaction.collection('payment').doc(refund.payment_id).update({
            data: {
              refund_state: -1
            }
          })
          if (refund.order_type=='book') {
            await transaction.collection('book_order').doc(refund.order_id).update({
              data: {
                refund_state: -1
              }
            })
          }
          if (refund.order_type=='inside') {
            await transaction.collection('inside_order').doc(refund.order_id).update({
              data: {
                refund_state: -1
              }
            })
          }
          if (refund.order_type=='outside') {
            await transaction.collection('outside_order').doc(refund.order_id).update({
              data: {
                refund_state: -1
              }
            })
          }
          await transaction.commit()
        }
      } else {
        let refund_update = {}
        let order_update = {}
        const transaction = await db.startTransaction()
        switch(refund_status) {
          case 'SUCCESS':
            refund_update.state = 1
            order_update.refund_state = 0
            break
          case 'REFUNDCLOSE':
            refund_update.state = -1
            refund_update.refund_status = 'REFUNDCLOSE'
            order_update.refund_state = -1
            await transaction.collection('payment').doc(refund.payment_id).update({
              data: {
                refund_state: -1
              }
            })
            break
          case 'CHANGE':
            refund_update.state = -1
            refund_update.refund_status = 'CHANGE'
            order_update.refund_state = -1
            await transaction.collection('payment').doc(refund.payment_id).update({
              data: {
                refund_state: -1
              }
            })
            break
        }
        await transaction.collection('payment_refund').doc(refund._id).update({
          data: refund_update
        })
        if (refund.order_type=='book') {
          await transaction.collection('book_order').doc(refund.order_id).update({
            data: order_update
          })
        }
        if (refund.order_type=='inside') {
          await transaction.collection('inside_order').doc(refund.order_id).update({
            data: order_update
          })
        }
        if (refund.order_type=='outside') {
          await transaction.collection('outside_order').doc(refund.order_id).update({
            data: order_update
          })
        }
        await transaction.commit()
      }
    }
  } catch (error) {}
}


exports.main = async (event, context) => {
  try {
    let date = moment().subtract(60, 'seconds')
    let res = await db.collection('payment_refund').where({
      state: 0,
      start_time: _.lt(date.toDate())
    }).get()
    for (let i = 0; i < res.data.length; i++) {
      await check_refund(res.data[i])
    }
  } catch (e) {
    return {
      errcode: -3,
      errmsg: '操作异常'
    }
  }
}