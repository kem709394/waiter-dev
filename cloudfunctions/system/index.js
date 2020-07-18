const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

//系统基础功能
class System {

  constructor() {
    this.user = null
    this.config = {}
  }

  static getInstace() {
    if (!System.instace) {
      System.instace = new System()
    }
    return System.instace
  }

  async getConfig() {
    let self = this
    let res = await db.collection('config').get()
    res.data.forEach(item => {
      self.config[item._id] = item.content
    })
  }

  async filterUser(openid) {
    let self = this
    let res = await db.collection('user').where({
      openid: openid
    }).get()
    if (res.data.length > 0) {
      self.user = res.data[0]
    } else {
      throw new Error('error!')
    }
  }

  async init() {
    try {
      await db.collection('address').get()
    } catch (err) {
      await db.createCollection('address')
    }
    try {
      await db.collection('book_order').get()
    } catch (err) {
      await db.createCollection('book_order')
    }
    try {
      await db.collection('cache').get()
    } catch (err) {
      await db.createCollection('cache')
    }
    try {
      await db.collection('column').get()
    } catch (err) {
      await db.createCollection('column')
    }
    try {
      await db.collection('config').get()
    } catch (err) {
      await db.createCollection('config')
    }
    try {
      await db.collection('delivery').get()
    } catch (err) {
      await db.createCollection('delivery')
    }
    try {
      await db.collection('delivery_stat').get()
    } catch (err) {
      await db.createCollection('delivery_stat')
    }
    try {
      await db.collection('feedback').get()
    } catch (err) {
      await db.createCollection('feedback')
    }
    try {
      await db.collection('inside_order').get()
    } catch (err) {
      await db.createCollection('inside_order')
    }
    try {
      await db.collection('invoke').get()
    } catch (err) {
      await db.createCollection('invoke')
    }
    try {
      await db.collection('kitchen').get()
    } catch (err) {
      await db.createCollection('kitchen')
    }
    try {
      await db.collection('menu').get()
    } catch (err) {
      await db.createCollection('menu')
    }
    try {
      await db.collection('menu_assist').get()
    } catch (err) {
      await db.createCollection('menu_assist')
    }
    try {
      await db.collection('menu_order_stat').get()
    } catch (err) {
      await db.createCollection('menu_order_stat')
    }
    try {
      await db.collection('notice').get()
    } catch (err) {
      await db.createCollection('notice')
    }
    try {
      await db.collection('order_stat').get()
    } catch (err) {
      await db.createCollection('order_stat')
    }
    try {
      await db.collection('outside_order').get()
    } catch (err) {
      await db.createCollection('outside_order')
    }
    try {
      await db.collection('payment').get()
    } catch (err) {
      await db.createCollection('payment')
    }
    try {
      await db.collection('payment_refund').get()
    } catch (err) {
      await db.createCollection('payment_refund')
    }
    try {
      await db.collection('printer').get()
    } catch (err) {
      await db.createCollection('printer')
    }
    try {
      await db.collection('queue').get()
    } catch (err) {
      await db.createCollection('queue')
    }
    try {
      await db.collection('serial_number').get()
    } catch (err) {
      await db.createCollection('serial_number')
    }
    try {
      await db.collection('staff').get()
    } catch (err) {
      await db.createCollection('staff')
    }
    try {
      await db.collection('table').get()
    } catch (err) {
      await db.createCollection('table')
    }
    try {
      await db.collection('user').get()
    } catch (err) {
      await db.createCollection('user')
    }
    try {
      await db.collection('vary_price').get()
    } catch (err) {
      await db.createCollection('vary_price')
    }
    return {
      errcode: 0
    }
  }

  async login(userInfo, openid) {
    try {
      let res = await db.collection('user').where({
        openid: openid
      }).get()
      if (res.data.length > 0) {
        let user = res.data[0]
        await db.collection('user').doc(user._id).update({
          data: {
            nick_name: userInfo.nickName,
            avatar_url: userInfo.avatarUrl,
            update_time: db.serverDate()
          }
        })
        let identity = {
          uid: user._id,
          openid: user.openid
        }
        if (user.mobile) identity.mobile = user.mobile
        if (user.address) identity.address = user.address
        if (user.contacts) identity.contacts = user.contacts
        res = await db.collection('staff').where({
          is_deleted: false,
          state: 1,
          openid: user.openid
        }).get()
        if (res.data.length > 0) {
          identity.staff = res.data[0]
        }
        return {
          errcode: 0,
          identity: identity
        }
      } else {
        res = await db.collection('user').add({
          data: {
            openid: openid,
            nick_name: userInfo.nickName,
            avatar_url: userInfo.avatarUrl,
            create_time: db.serverDate()
          }
        })
        return {
          errcode: 0,
          identity: {
            uid: res._id,
            openid: openid
          }
        }
      }
    } catch (e) {
      throw new Error('error!')
    }
  }

  async bindMobile(phoneInfo) {
    try {
      let self = this
      let mobile = phoneInfo.data.purePhoneNumber
      await db.collection('user').doc(self.user._id).update({
        data: {
          mobile: mobile,
          update_time: db.serverDate()
        }
      })
      return {
        errcode: 0
      }
    } catch (e) {
      throw new Error('error!')
    }
  }

  async getQRCode(data) {
    try {
      let res = await cloud.openapi.wxacode.createQRCode(data)
      if (res.buffer) {
        return {
          errcode: 0,
          url: 'data:' + res.contentType + ';base64,' + Buffer.from(res.buffer, 'utf8').toString('base64')
        }
      }
      return {
        errcode: -1
      }
    } catch (e) {
      throw new Error('error!')
    }
  }

  async getWxacode1(data) {
    try {
      let res = await cloud.openapi.wxacode.get(data)
      if (res.buffer) {
        return {
          errcode: 0,
          url: 'data:' + res.contentType + ';base64,' + Buffer.from(res.buffer, 'utf8').toString('base64')
        }
      }
      return {
        errcode: -1
      }
    } catch (e) {
      throw new Error('error!')
    }
  }

  async getWxacode2(data) {
    try {
      let res = await cloud.openapi.wxacode.getUnlimited(data)
      if (res.buffer) {
        return {
          errcode: 0,
          url: 'data:' + res.contentType + ';base64,' + Buffer.from(res.buffer, 'utf8').toString('base64')
        }
      }
      return {
        errcode: -1
      }
    } catch (e) {
      throw new Error('error!')
    }
  }

  async updateStaff() {
    try {
      let res = await db.collection('staff').where({
        is_deleted: false
      }).get()
      let openids = []
      res.data.forEach(item=>{
        openids.push(item.openid)
      })
      res = await db.collection('cache').doc('staff').update({
        data: {
          data: openids
        }
      })
      return {
        errcode: 0
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

}

exports.main = async(event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const instance = System.getInstace()
    switch (event.action) {
      case 'init':
        return await instance.init()
      case 'login':
        return await instance.login(event.data, wxContext.OPENID)
      case 'bindMobile':
        await instance.filterUser(wxContext.OPENID)
        await instance.getConfig()
        return await instance.bindMobile(event.phoneInfo)  
      case 'getQRCode':
        return await instance.getQRCode(event.data)
      case 'getWxacode1':
        return await instance.getWxacode1(event.data)
      case 'getWxacode2':
        return await instance.getWxacode2(event.data)
      case 'updateStaff':
        return await instance.updateStaff()
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