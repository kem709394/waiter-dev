const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
//易联云SDK
//技术文档 http://doc2.10ss.net/331992
const yly = require('yly-nodejs-sdk')

//云打印服务
class Printer {

  constructor() {
    this.config = {
      cid: '*******', //易联云颁发给开发者的应用ID
      secret: '*******', //应用秘钥
      token: '*******' //通过易联云终端授权 (永久授权)，获取的access_token
    }
    this.client = null
    this.printer = null
  }

  static getInstace() {
    if (!Printer.instace) {
      Printer.instace = new Printer()
    }
    return Printer.instace
  }

  async filter(id) {
    let self = this
    let ylyConfig = new yly.Config({
      cid: self.config.cid,
      secret: self.config.secret
    })
    self.client = new yly.RpcClient(self.config.token, ylyConfig)
    let res = await db.collection('printer').doc(id).get()
    self.printer = res.data
  }

  async setsound(data) {
    try {
      let self = this
      let printer = new yly.Printer(self.client)
      return await printer.setsound(self.printer.code, data.voice, data.type)
    } catch (err) {
      throw new Error('error!')
    }
  }

  async print(data) {
    try {
      let self = this
      let print = new yly.Print(self.client)
      return await print.index(self.printer.code, data.originId, data.content)
    } catch (err) {
      throw new Error('error!')
    }
  }

  async express_print(data) {
    try {
      let self = this
      let expressPrint = new yly.ExpressPrint(self.client)
      return await expressPrint.index(self.printer.code, data.content, data.originId)
    } catch (err) {
      throw new Error('error!')
    }
  }

  async picture_print(data) {
    try {
      let self = this
      let picturePrint = new yly.PicturePrint(self.client)
      return await picturePrint.index(self.printer.code, data.pictureUrl, data.originId)
    } catch (err) {
      throw new Error('error!')
    }
  }

}

exports.main = async (event, context) => {
  try {
    const instance = Printer.getInstace()
    await instance.filter(event.id)
    switch (event.action) {
      case 'setsound':
        return await instance.setsound(event.data)
      case 'print':
        return await instance.print(event.data)
      case 'express_print':
        return await instance.express_print(event.data)
      case 'picture_print':
        return await instance.picture_print(event.data)
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