const cloud = require('wx-server-sdk')
const moment = require('moment')
cloud.init()
const db = cloud.database()
const _ = db.command

//排队服务功能
class Queue {
  constructor() {
    this.staff = null
    this.config = {}
  }

  static getInstace() {
    if (!Queue.instace) {
      Queue.instace = new Queue()
    }
    return Queue.instace
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

  async genNo() {
    try {
      let res = await db.collection('serial_number').doc('queue').get()
      let current = res.data.current
      const transaction = await db.startTransaction()
      await transaction.collection('serial_number').doc('queue').update({
        data: {
          current: _.inc(1)
        }
      })
      await transaction.commit()
      return current
    } catch (e) {
      return null
    }
  }

  async print_receipt(queue) {
    try {
      let self = this
      let page_text = `<FS2><center>**${self.config.base.name}**</center></FS2><FB><center>电话：${self.config.base.telephone}</center></FB>`
      page_text += `<FS2><center>号码:${queue.number}</center></FS2>`
      page_text += `<FB>使用人数:${queue.amount}</FB>\r\n`
      page_text += `<FB>取号时间:${moment(queue.create_time).format('YYYY-MM-DD HH:mm')}</FB>\r\n`
      if (queue.note != '') {
        page_text += `<FB>备注内容:${queue.note}</FB>\r\n`
      }
      for (let i = 0; i < self.config.queue.voucher.printer.length; i++) {
        let content = `<MN>${self.config.queue.voucher.printer[i].page}</MN>`
        content += page_text
        content += `<FS2><center>****** 完 ******</center></FS2>`
        content += '<center>技术:白马为科技 电话:13902660720</center><audio>打印排队回执,5,0</audio>'
        try {
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: self.config.queue.voucher.printer[i].id,
              data: {
                originId: queue.create_time.getTime(),
                content: content
              }
            }
          })
        } catch (err) { }
      }
    } catch (err) {}
  }

  async create_active(data, openid) {
    try {
      let self = this
      if (self.config.queue.active && self.config.queue.open) {
        let res = await db.collection('queue').where({
          openid: openid,
          progress: 'wait'
        }).count()
        if (res.total == 0) {
          let queue_no = await self.genNo()
          if (queue_no == null) {
            return {
              errcode: -1,
              errmsg: '系统繁忙'
            }
          }
          let queue = {
            openid: openid,
            number: queue_no,
            note: data.note,
            amount: data.amount,
            progress: 'wait',
            create_time: new Date()
          }
          res = await db.collection('queue').add({
            data: queue
          })
          return {
            errcode: 0,
            id: res._id
          }
        } else {
          return {
            errcode: -1,
            errmsg: '不可重复取号'
          }
        }
      } else {
        return {
          errcode: -1,
          errmsg: '停止取号'
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async create_passive(data) {
    try {
      let self = this
      let queue_no = await self.genNo()
      if (queue_no == null) {
        return {
          errcode: -1,
          errmsg: '系统繁忙'
        }
      }
      let queue = {
        number: queue_no,
        note: data.note,
        amount: data.amount,
        progress: 'wait',
        create_sid: self.staff._id,
        create_time: new Date()
      }
      let res = await db.collection('queue').add({
        data: queue
      })
      if (self.config.queue.voucher.active && data.print) {
        await self.print_receipt(queue)
      }
      return {
        errcode: 0,
        id: res._id
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async ready(id) {
    try {
      let self = this
      let res = await db.collection('queue').doc(id).get()
      let queue = res.data
      if (queue.progress == 'wait') {
        res = await db.collection('queue').doc(id).update({
          data: {
            progress: 'ready',
            ready_time: new Date()
          }
        })
        if (self.config.queue.notify.active && queue.openid) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: queue._openid,
              page: 'pages/index/index',
              data: {
                thing2: {
                  value: queue.number
                },
                thing3: {
                  value: '准备就餐'
                }
              },
              templateId: self.config.queue.notify.template.remind
            })
          } catch (err) {}
        }
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1,
        errmsg: '系统繁忙'
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async finish(id) {
    try {
      await db.collection('queue').doc(id).update({
        data: {
          progress: 'finish',
          finish_time: new Date()
        }
      })
      return {
        errcode: 0
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async destroy() {
    try {
      await db.collection('queue').where({
        number: _.gt(0)
      }).remove()
      await db.collection('serial_number').doc('queue').update({
        data: {
          current: 1
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
    const instance = Queue.getInstace()
    switch (event.action) {
      case 'create_active':
        await instance.getConfig()
        return await instance.create_active(event.data, wxContext.OPENID)
      case 'create_passive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.create_passive(event.data)
      case 'ready':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.ready(event.id)
      case 'finish':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.finish(event.id)
      case 'destroy':
        return await instance.destroy()
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