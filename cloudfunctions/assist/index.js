const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

//辅助服务功能
class Assist {
  constructor() {
    this.config = {}
  }

  static getInstace() {
    if (!Assist.instace) {
      Assist.instace = new Assist()
    }
    return Assist.instace
  }

  async getConfig() {
    let self = this
    let res = await db.collection('config').get()
    res.data.forEach(item => {
      self.config[item._id] = item.content
    })
  }

  async invoke_print(invoke) {
    try {
      let self = this
      for (let i = 0; i < self.config.invoke.voucher.printer.length; i++) {
        let content = `呼叫通知<audio>${invoke.table}呼叫服务员,5,0</audio>`
        try {
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: self.config.invoke.voucher.printer[i].printer,
              data: {
                originId: invoke.create_time.getTime(),
                content: content
              }
            }
          })
        } catch (err) { }
      }
    } catch (err) {}
  }

  async invoke_notice(table, note) {
    try { 
      let self = this
      let res = await db.collection('staff').where({
        is_deleted: false,
        state: 1
      }).limit(1000).get()
      for (let i in res.data) {
        let staff = res.data[i]
        if (staff.openid && staff.subscribe && staff.subscribe.includes('invoke')) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: staff.openid,
              page: 'pages/index/index',
              data: {
                thing1: {
                  value: table + '-呼叫服务员'
                },
                thing2: {
                  value: note
                }
              },
              templateId: self.config.base.notify.template.invoke
            })
          } catch (err) { }
        }
      }
    } catch (err) { }
  }

  async invoke_create(data, openid) {
    try {
      let self = this
      let invoke = {
        openid: openid,
        table: data.table,
        note: data.note,
        create_time: new Date()
      }
      let res = await db.collection('invoke').add({
        data: invoke
      })
      if (self.config.invoke.voucher.active) {
        await self.invoke_print(invoke)
      }
      if (self.config.base.notify.active) {
        await self.invoke_notice(invoke.table, invoke.note)
      }
      return {
        errcode: 0,
        invoke: {
          id: res._id
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async invoke_remove(id) {
    try {
      await db.collection('invoke').doc(id).remove()
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
    const instance = Assist.getInstace()
    switch (event.action) {
      case 'invoke_create':
        await instance.getConfig()
        return await instance.invoke_create(event.data, wxContext.OPENID)
      case 'invoke_remove':
        return await instance.invoke_remove(event.id)
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