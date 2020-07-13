const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

//支付回调
async function book_order(payment_id) {
  let res = await cloud.callFunction({
    name: 'book_order',
    data: {
      action: 'payment_success',
      payment_id: payment_id
    }
  })
  if (res.result.errcode == 0) {
    return {
      errcode: 0,
      errmsg: 'OK'
    }
  } else {
    return {
      errcode: -1
    }
  }
}

async function inside_order(payment_id) {
  let res = await cloud.callFunction({
    name: 'inside_order',
    data: {
      action: 'payment_success',
      payment_id: payment_id
    }
  })
  if (res.result.errcode == 0) {
    return {
      errcode: 0,
      errmsg: 'OK'
    }
  } else {
    return {
      errcode: -1
    }
  }
}

async function outside_order(payment_id) {
  let res = await cloud.callFunction({
    name: 'outside_order',
    data: {
      action: 'payment_success',
      payment_id: payment_id
    }
  })
  if (res.result.errcode == 0) {
    return {
      errcode: 0,
      errmsg: 'OK'
    }
  } else {
    return {
      errcode: -1
    }
  }
}

async function recharge_order(payment_id) {
  let res = await cloud.callFunction({
    name: 'recharge_order',
    data: {
      action: 'payment_success',
      payment_id: payment_id
    }
  })
  if (res.result.errcode == 0) {
    return {
      errcode: 0,
      errmsg: 'OK'
    }
  } else {
    return {
      errcode: -1
    }
  }
}

async function store_order(payment_id) {
  let res = await cloud.callFunction({
    name: 'store_order',
    data: {
      action: 'payment_success',
      payment_id: payment_id
    }
  })
  if (res.result.errcode == 0) {
    return {
      errcode: 0,
      errmsg: 'OK'
    }
  } else {
    return {
      errcode: -1
    }
  }
}

exports.main = async (event) => {
  try {
    if (event.returnCode == 'SUCCESS') {
      if (event.resultCode == 'SUCCESS') {
        switch(event.attach) {
          case 'book':
            return await book_order(event.outTradeNo)
          case 'inside':
            return await inside_order(event.outTradeNo)
          case 'outside':
            return await outside_order(event.outTradeNo)
        }
      } else {
        await db.collection('payment').doc(event.outTradeNo).update({
          data: {
            state: -1,
            end_time: db.serverDate()
          }
        })
        return {
          errcode: 0,
          errmsg: 'OK'
        }
      }
    }
  } catch (error) {}
}