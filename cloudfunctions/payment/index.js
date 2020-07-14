const cloud = require('wx-server-sdk')
cloud.init()
const ip = require('ip')

//微信支付
class Payment {

  constructor() {
    this.config = {
      env_id: '*******', //云函数环境
      mch_id: '*******' //商户号
    }
  }

  static getInstace() {
    if (!Payment.instace) {
      Payment.instace = new Payment()
    }
    return Payment.instace
  }

  genNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let length = 16
    let maxPos = chars.length
    let nonce = ''
    while (length--) nonce += chars[Math.random() * maxPos | 0]
    return nonce
  }

  async unified(trade_no, body, totalFee, attach) {
    let self = this
    let res = await cloud.cloudPay.unifiedOrder({
      body: body,
      outTradeNo: trade_no,
      spbillCreateIp: ip.address() || '127.0.0.1',
      totalFee: totalFee,
      attach: attach,
      envId: self.config.env_id,
      subMchId: self.config.mch_id,
      functionName: 'payment_back'
    })
    if (res.returnCode == 'SUCCESS' && res.resultCode == 'SUCCESS') {
      return {
        errcode: 0,
        payment: res.payment
      }
    } else {
      return {
        errcode: -1
      }
    }
  }

  async query(trade_no) {
    let self = this
    let res = await cloud.cloudPay.queryOrder({
      subMchId: self.config.mch_id,
      outTradeNo: trade_no,
      nonce_str: self.genNonce()
    })
    if (res.returnCode == 'SUCCESS' && res.resultCode == 'SUCCESS' && res.tradeState == 'SUCCESS') {
      return {
        errcode: 0
      }
    } else {
      return {
        errcode: -1
      }
    }
  }

  async close(trade_no) {
    let self = this
    let res = await cloud.cloudPay.closeOrder({
      subMchId: self.config.mch_id,
      outTradeNo: trade_no,
      nonce_str: self.genNonce()
    })
    if (res.returnCode == 'SUCCESS' && res.resultCode == 'SUCCESS') {
      return {
        errcode: 0
      }
    } else {
      return {
        errcode: -1
      }
    }
  }

  async refund(trade_no, refund_no, total_fee, refund_fee) {
    let self = this
    let res = await cloud.cloudPay.refund({
      subMchId: self.config.mch_id,
      nonce_str: self.genNonce(),
      out_trade_no: trade_no,
      out_refund_no: refund_no,
      total_fee: total_fee,
      refund_fee: refund_fee
    })
    if (res.returnCode == 'SUCCESS' && res.resultCode == 'SUCCESS') {
      return {
        errcode: 0
      }
    } else {
      return {
        errcode: -1
      }
    }
  }

  async query_refund(refund_no) {
    let self = this
    let res = await cloud.cloudPay.queryRefund({
      sub_mch_id: self.config.mch_id,
      nonce_str: self.genNonce(),
      out_refund_no: refund_no
    })
    if (res.returnCode == 'SUCCESS' && res.resultCode == 'SUCCESS') {
      return {
        errcode: 0,
        refund_status: refund_status_0
      }
    } else {
      return {
        errcode: -1,
        res: JSON.stringify(res)
      }
    }
  }
}

exports.main = async (event, context) => {
  try {
    const instance = Payment.getInstace()
    switch (event.action) {
      case 'unified':
        return await instance.unified(event.trade_no, event.body, event.totalFee, event.attach)
      case 'query':
        return await instance.query(event.trade_no)
      case 'close':
        return await instance.close(event.trade_no)
      case 'refund':
        return instance.refund(event.trade_no, event.refund_no, event.total_fee, event.refund_fee)
      case 'query_refund':
        return await instance.query_refund(event.refund_no) 
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