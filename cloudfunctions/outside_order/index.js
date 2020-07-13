const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const moment = require('moment')

//外卖服务功能
class Order {
  constructor() {
    this.user = null
    this.staff = null
    this.member = null
    this.config = {}
  }

  static getInstace() {
    if (!Order.instace) {
      Order.instace = new Order()
    }
    return Order.instace
  }

  genOrderSn() {
    let sn = moment().format('YYYYMMDDHHmmssSSS')
    let random = ('00' + Math.floor(Math.random() * 1000)).substr(-3)
    return sn + random
  }

  async filterUser(openid) {
    let self = this
    let res = await db.collection('user').where({
      openid: openid
    }).get()
    if (res.data.length) {
      self.user = res.data[0]
    } else {
      throw new Error('error!')
    }
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

  async genSerial() {
    try {
      const transaction = await db.startTransaction()
      let res = await transaction.collection('serial_number').doc('order').get()
      let number = res.data
      let valid_date = moment(number.valid_date)
      if (moment().isSame(valid_date, 'day')) {
        await transaction.collection('serial_number').doc('order').update({
          data: {
            current: _.inc(1)
          }
        })
        await transaction.commit()
        return number.current
      } else {
        await transaction.collection('serial_number').doc('order').update({
          data: {
            current: 2,
            valid_date: db.serverDate()
          }
        })
        await transaction.commit()
        return 1
      }
    } catch (e) {
      return null
    }
  }

  async sync_menu_sku(mode, menu_list) {
    try {
      for (let key1 in menu_list) {
        let item1 = menu_list[key1]
        let amount = item1.amount
        await db.collection('menu').doc(item1.id).update({
          data: {
            'statistics.sales': _.inc(mode == '-' ? amount : -amount),
            'sku.count': _.inc(mode == '-' ? amount : -amount)
          }
        })
        if (item1.combo) {
          for (let key2 in item1.combo) {
            let item2 = item1.combo[key2]
            await db.collection('menu').doc(item2.id).update({
              data: {
                'statistics.sales': _.inc(mode == '-' ? amount : -amount),
                'sku.count': _.inc(mode == '-' ? amount : -amount)
              }
            })
          }
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async kitchen_print(order) {
    try {
      let kitchen = {}
      let res = await db.collection('kitchen').where({
        is_deleted: false
      }).limit(1000).get()
      res.data.forEach(item => {
        kitchen[item._id] = item
      })
      for (let i in order.menu_list) {
        let item1 = order.menu_list[i]
        if (item1.type == 'single') {
          if (item1.kitchen != '' && kitchen[item1.kitchen]) {
            let content = `<FS><center>NO.${order.order_sn}</center></FS>`
            let title = item1.name
            if (item1.model) {
              title += `(${item1.model})`
            }
            if (item1.pack) {
              title += '[打包]'
            }
            content += `<FS2>${title} x${item1.amount}</FS2>\r\n`
            if (item1.option) {
              let text = item1.option.join(' ')
              content += `<FS>${text}</FS>\r\n`
            }
            if (item1.remark) {
              content += `<FS>备注:${item1.remark}</FS>\r\n`
            }
            if (order.table) {
              content += `<FS>餐桌：${order.table}</FS>\r\n`
            } else {
              content += `<FS>外卖：#${order.order_no}</FS>\r\n`
            }
            content += `<FS>时间：${moment().format('HH:mm')}</FS>\r\n`
            content += '<center>******************************</center>'
            try {
              await cloud.callFunction({
                name: 'printer',
                data: {
                  action: 'print',
                  id: kitchen[item1.kitchen].printer,
                  data: {
                    originId: new Date().getTime(),
                    content: content
                  }
                }
              })
            } catch (err) { }
          }
        } else {
          for (let j in item1.combo) {
            let item2 = item1.combo[j]
            if (item2.kitchen != '' && kitchen[item2.kitchen]) {
              let content = `<FS><center>NO.${order.order_sn}</center></FS>`
              let title = item2.name
              if (item2.model) {
                title += `(${item2.model})`
              }
              if (item2.pack) {
                title += '[打包]'
              }
              content += `<FS2>${title} x${item1.amount}</FS2>\r\n`
              if (item2.option) {
                let text = item2.option.join(' ')
                content += `<FS>${text}</FS>\r\n`
              }
              if (item1.remark) {
                content += `<FS>备注:${item1.remark}</FS>\r\n`
              }
              if (order.table) {
                content += `<FS>餐桌：${order.table}</FS>\r\n`
              } else {
                content += `<FS>外卖：#${order.order_no}</FS>\r\n`
              }
              content += `<FS>时间：${moment().format('HH:mm')}</FS>\r\n`
              content += '<center>******************************</center>'
              try { 
                await cloud.callFunction({
                  name: 'printer',
                  data: {
                    action: 'print',
                    id: kitchen[item2.kitchen].printer,
                    data: {
                      originId: new Date().getTime(),
                      content: content
                    }
                  }
                })
              } catch (err) { }
            }
          }
        }
      }
    } catch (err) {}
  }

  async wechat_notice(order_sn) {
    try { 
      let self = this
      let config = self.config
      let res = await db.collection('staff').where({
        is_deleted: false,
        state: 1
      }).limit(1000).get()
      for(let i in res.data) {
        let staff = res.data[i]
        if (staff.openid && staff.subscribe && staff.subscribe.includes('order')) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: staff.openid,
              page: 'pages/index/index',
              data: {
                character_string1: {
                  value: order_sn
                },
                phrase3: {
                  value: '外卖订单'
                },
                date4: {
                  value: moment().format('YYYY-MM-DD HH:mm')
                }
              },
              templateId: config.base.notify.template.order
            })
          } catch (err) { }
        }
      }
    } catch (err) { }
  }

  async print_notice(order) {
    try {
      let self = this
      let config = self.config
      let page_text = `<FS2><center>**${config.base.name}**</center></FS2><FB><center>电话：${config.base.telephone}</center></FB>`
      page_text += `<FS><center>外卖#${order.order_no}</center></FS>`
      page_text += `<FB>订单编号:${order.order_sn}</FB>\r\n`
      page_text += `<FB>下单时间:${moment(order.create_time).format('YYYY-MM-DD HH:mm')}</FB>\r\n`
      page_text += `<FB>客户电话:${order.contacts.mobile}</FB>\r\n`
      if (order.mode == 'delivery') {
        if (order.location) {
          page_text += `<FB>配送地址:${order.location.name} ${order.address}</FB>\r\n`
        } else {
          page_text += `<FB>配送地址:${order.address}</FB>\r\n`
        }
        if (order.time_string == '0') {
          page_text += `<FB>配送时间:立即配送</FB>\r\n`
        } else {
          page_text += `<FB>配送时间:${order.time_string}</FB>\r\n`
        }
      } else if (order.mode == 'takeaway') {
        if (order.time_string == '0') {
          page_text += `<FB>提取时间:马上到店</FB>\r\n`
        } else {
          page_text += `<FB>提取时间:${order.time_string}</FB>\r\n`
        }
      }
      let menu_text = ''
      order.menu_list.forEach(item1 => {
        let title = item1.name
        if (item1.model) {
          title += `<${item1.model}>`
        }
        if (item1.option) {
          title += '[' + item1.option.join(',') + ']'
        }
        if (item1.gift) {
          title += '(赠品)'
        }
        menu_text += `\r\n<FS><FB>${title} x${item1.amount}</FS></FB>\r\n`
        if (item1.combo) {
          item1.combo.forEach(item2 => {
            let sub_title = '├' + item2.name
            if (item2.option) {
              sub_title += '[' + item2.option.join(',') + ']'
            }
            menu_text += `<FB>${sub_title}</FB>\r\n`
          })
        }
        if (item1.remark) {
          menu_text += `<FB>备注：${item1.remark}</FB>\r\n`
        }
      })
      page_text += `<center>**************菜品**************</center>`
      page_text += menu_text + '\r\n'
      if (order.remark != '') {
        page_text += `<center>**************备注**************</center>`
        page_text += `<FS><FB>${order.remark}</FB></FS>\r\n`
      }
      page_text += `<center>**************其它**************</center>`
      let fee_text = ''
      if (order.tableware != '') {
        fee_text += `<LR>餐具份数,${order.tableware} </LR>`
      }
      if (order.pack_money > 0) {
        fee_text += `<LR>打包费用,￥${order.pack_money / 100}</LR>`
      }
      if (order.delivery_money) {
        fee_text += `<LR>配送费用,￥${order.delivery_money / 100}</LR>`
      }
      fee_text += `<LR>合计金额,￥${order.total_money / 100}</LR>`
      if (order.discount_money) {
        fee_text += `<LR>赠送金额,￥${order.discount_money / 100}</LR>`
        fee_text += `<LR>应付金额,￥${order.payable_money / 100}</LR>`
      }
      page_text += `<FB>${fee_text}</FB>`
      for (let i = 0; i < config.outside.voucher.printer.length; i++) {
        let content = `<MN>${config.outside.voucher.printer[i].page}</MN>`
        content += page_text
        if (order.payment_state == 2) {
          content += `<FS2><center>**** 已付款 ****</center></FS2>`
        } else {
          content += `<FS2><center>****** 完 ******</center></FS2>`
        }
        content += `<center>*************订单码*************</center>`
        content += `<QR>${order._id}</QR>`
        content += `<center>技术:白马为科技</center><audio>有新的外卖订单,5,0</audio>`
        try { 
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: config.outside.voucher.printer[i].id,
              data: {
                originId: order.order_sn,
                content: content
              }
            }
          })
        } catch (err) { }
      }
    } catch (err) {}
  }

  async create_active(data) {
    try {
      let self = this
      let order_no = await self.genSerial()
      if (order_no == null) {
        return {
          errcode: -1,
          errmsg: '系统繁忙'
        }
      }
      let user = self.user
      let config = self.config
      let menu_data = {}
      let menu_list = []
      let pack_money = 0
      let total_money = 0
      let res = await db.collection('menu').where({
        _id: _.in(data.menu_ids)
      }).get()
      res.data.forEach(item=>{
        menu_data[item._id] = item
      })
      for (let i in data.list) {
        let order_item = data.list[i]
        let menu = menu_data[order_item.id]
        let menu_item = {
          id: menu._id,
          type: menu.type,
          name: menu.name,
          cover: menu.cover,
          amount: order_item.amount
        }
        if (menu.type == 'single') {
          menu_item.kitchen = menu.kitchen
          if (menu.model.active) {
            let temp = null
            menu.model.list.forEach(item => {
              if (item.name == order_item.form.model) {
                temp = item
              }
            })
            if (temp == null) {
              return {
                errcode: -1,
                errmsg: '规格不存在'
              }
            } else {
              menu_item.model = temp.name
              menu_item.price = menu.price + temp.raise
            }
          } else {
            menu_item.price = menu.price
          }
          if (menu.option.active && order_item.form.option) {
            menu_item.option = order_item.form.option
          }
        } else if (menu.type == 'vary') {
          menu_item.kitchen = menu.kitchen
          menu_item.model = order_item.form.model
          menu_item.price = order_item.form.price
          if (menu.option.active && order_item.form.option) {
            menu_item.option = order_item.form.option
          }
        } else {
          menu_item.price = menu.price
          let combo = []
          for (let j in order_item.form.combo) {
            let item1 = order_item.form.combo[j]
            for (let k in item1) {
              let item2 = item1[k]
              let menu2 = menu_data[item2.id]
              if (item2.option) {
                combo.push({
                  id: menu2._id,
                  name: menu2.name,
                  cover: menu2.cover,
                  kitchen: menu2.kitchen,
                  option: item2.option
                })
              } else {
                combo.push({
                  id: menu2._id,
                  name: menu2.name,
                  cover: menu2.cover,
                  kitchen: menu2.kitchen
                })
              }
            }
          }
          menu_item.combo = combo
        }
        if (menu.pack.money > 0) {
          if (menu.pack.mode == 'every') {
            pack_money += menu.pack.money * menu_item.amount
          } else {
            pack_money += menu.pack.money
          }
        }
        total_money += menu_item.price * menu_item.amount
        if (order_item.remark) {
          let remark = order_item.remark.trim()
          if (remark.length > 0) {
            menu_item.remark = remark
          }
        }
        menu_list.push(menu_item)
      }
      total_money += pack_money
      let order = {
        openid: user.openid,
        owner_uid: user._id,
        mode: data.mode,
        order_no: order_no,
        order_sn: self.genOrderSn(),
        time_string: data.time_string,
        menu_list: menu_list,
        remark: data.remark,
        tableware: data.tableware,
        contacts: data.contacts,
        pack_money: pack_money,
        total_money: total_money,
        payable_money: total_money,
        is_deleted: false,
        state: 0,
        payment_state: 0,
        payment_money: 0,
        refund_state: 0,
        refund_money: 0,
        delivery_state: 0,
        create_uid: user._id,
        create_time: db.serverDate()
      }
      if (order.mode == 'delivery') {
        order.address = data.address
        order.location = data.location
        if (data.delivery_money > 0) {
          order.delivery_money = data.delivery_money
          order.total_money += data.delivery_money
          order.payable_money += data.delivery_money
        }
        if (!config.outside.payment) {
          order.state = 10
        }
      } else if (order.mode == 'takeaway') {
        if (!self.config.outside.payment) {
          order.state = 10
        }
      }
      res = await db.collection('outside_order').add({
        data: order
      })
      if (order.state == 10) {
        await self.auto_order(res._id)
      }
      await self.sync_menu_sku('-', order.menu_list)
      return {
        errcode: 0,
        order: {
          order_id: res._id,
          order_sn: order.order_sn
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async create_passive(data) {
    try {
      let self = this
      let order_no = await self.genSerial()
      if (order_no == null) {
        return {
          errcode: -1,
          errmsg: '系统繁忙'
        }
      }
      let staff = self.staff
      let menu_data = {}
      let menu_list = []
      let pack_money = 0
      let total_money = 0
      let reward_money = 0
      let res = await db.collection('menu').where({
        _id: _.in(data.menu_ids)
      }).get()
      res.data.forEach(item=>{
        menu_data[item._id] = item
      })
      for (let i in data.list) {
        let order_item = data.list[i]
        let menu = menu_data[order_item.id]
        let menu_item = {
          id: menu._id,
          type: menu.type,
          name: menu.name,
          cover: menu.cover,
          amount: order_item.amount,
          kitchen: menu.kitchen
        }
        if (menu.type == 'single') {
          menu_item.kitchen = menu.kitchen
          if (menu.model.active) {
            let temp = null
            menu.model.list.forEach(item => {
              if (item.name == order_item.form.model) {
                temp = item
              }
            })
            if (temp == null) {
              return {
                errcode: -1,
                errmsg: '规格不存在'
              }
            } else {
              menu_item.model = temp.name
              menu_item.price = menu.price + temp.raise
            }
          } else {
            menu_item.price = menu.price
          }
          if (menu.option.active && order_item.form.option) {
            menu_item.option = order_item.form.option
          }
        } else if (menu.type == 'vary') {
          menu_item.kitchen = menu.kitchen
          menu_item.model = order_item.form.model
          menu_item.price = order_item.form.price
          if (menu.option.active && order_item.form.option) {
            menu_item.option = order_item.form.option
          }
        } else {
          menu_item.price = menu.price
          let combo = []
          for (let j in order_item.form.combo) {
            let item1 = order_item.form.combo[j]
            for (let k in item1) {
              let item2 = item1[k]
              let menu2 = await db.collection('menu').doc(item2.id).get()
              if (item2.option) {
                combo.push({
                  id: menu2.data._id,
                  name: menu2.data.name,
                  cover: menu2.data.cover,
                  kitchen: menu2.data.kitchen,
                  option: item2.option
                })
              } else {
                combo.push({
                  id: menu2.data._id,
                  name: menu2.data.name,
                  cover: menu2.data.cover,
                  kitchen: menu2.data.kitchen
                })
              }
            }
          }
          menu_item.combo = combo
        }
        if (menu.pack.money > 0) {
          if (menu.pack.mode == 'every') {
            pack_money += menu.pack.money * menu_item.amount
          } else {
            pack_money += menu.pack.money
          }
        }
        total_money += menu_item.price * menu_item.amount
        if (order_item.form.gift) {
          menu_item.gift = true
          reward_money += menu_item.price * menu_item.amount
        } 
        if (order_item.remark) {
          let remark = order_item.remark.trim()
          if (remark.length > 0) {
            menu_item.remark = remark
          }
        }
        menu_list.push(menu_item)
      }
      if (pack_money > 0) {
        total_money += pack_money
      }
      let order = {
        mode: data.mode,
        order_no: order_no,
        order_sn: self.genOrderSn(),
        time_string: data.time_string,
        contacts: data.contacts,
        menu_list: menu_list,
        remark: data.remark,
        tableware: data.tableware,
        pack_money: pack_money,
        total_money: total_money,
        reward_money: reward_money,
        payable_money: total_money - reward_money,
        is_deleted: false,
        state: 10,
        payment_state: 0,
        payment_money: 0,
        refund_state: 0,
        refund_money: 0,
        create_uid: '0',
        create_sid: staff._id,
        create_time: db.serverDate(),
        receive_sid: staff._id,
        receive_time: db.serverDate()
      }
      if (order.mode == 'delivery') {
        order.address = data.address
        order.delivery_state = 0
        if (data.delivery_money > 0) {
          order.delivery_money = data.delivery_money
          order.total_money = order.total_money + data.delivery_money
          order.payable_money = order.payable_money + data.delivery_money
        }
      }
      res = await db.collection('outside_order').add({
        data: order
      })
      await self.auto_order(res._id)
      await self.sync_menu_sku('-', order.menu_list)
      return {
        errcode: 0,
        order: {
          order_id: res._id,
          order_sn: order.order_sn
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async cancel_active(id, data) {
    try {
      let self = this
      let user = self.user
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.openid == user.openid && order.state == 10) {
        let update = {
          state: 41,
          cancel_note: data.note,
          cancel_time: db.serverDate(),
          cancel_uid: user._id
        }
        if (order.payment_money > 0) {
          const transaction = await db.startTransaction()
          res = await transaction.collection('payment_refund').add({
            data: {
              openid: order.openid,
              order_id: order._id,
              order_type: 'outside',
              payment_id: order.payment_id,
              note: '取消订单',
              money: order.payment_money,
              state: 0,
              start_time: db.serverDate()
            }
          })
          update.refund_state = 1
          update.refund_money =  order.payment_money
          await transaction.collection('outside_order').doc(order._id).update({
            data: update
          })
          res = await cloud.callFunction({
            name: 'payment',
            data: {
              action: 'refund',
              trade_no: order.payment_id,
              refund_no: res._id,
              total_fee: order.payment_money, 
              refund_fee: order.payment_money
            }
          })
          if (res.result.errcode == 0) {
            await transaction.commit()
            await self.sync_menu_sku('+', order.menu_list)
            return {
              errcode: 0
            }
          } else {
            return {
              errcode: -1
            }
          }
        } else {
          await db.collection('outside_order').doc(order._id).update({
            data: update
          })
          await self.sync_menu_sku('+', order.menu_list)
          return {
            errcode: 0
          }
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

  async cancel_passive(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.state >= 10 && order.state < 20) {
        await db.collection('outside_order').doc(order._id).update({
          data: {
            state: 42,
            cancel_note: data.note,
            cancel_time: db.serverDate(),
            cancel_sid: staff._id
          }
        })
        await self.sync_menu_sku('+', order.menu_list)
        if (order.openid && config.outside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/outside/detail?id=' + order._id,
              data: {
                character_string1: {
                  value: order.order_sn
                },
                date2: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing5: {
                  value: update.cancel_note
                },
                thing10: {
                  value: '如有疑问请联系我们!'
                }
              },
              templateId: config.outside.notify.template.cancel
            })
          } catch (err) {}
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

  async remove(id) {
    try {
      let self = this
      let staff = self.staff
      await db.collection('outside_order').doc(id).update({
        data: {
          is_deleted: true,
          remove_sid: staff._id,
          remove_time: db.serverDate()
        }
      })
      return {
        errcode: 0
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async modify(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.state > 10 && order.state < 20) {
        let menu_data = {}
        let menu_list = []
        let pack_money = 0
        let total_money = 0
        let reward_money = 0
        res = await db.collection('menu').where({
          _id: _.in(data.menu_ids)
        }).get()
        res.data.forEach(item=>{
          menu_data[item._id] = item
        })
        for (let i in data.menu_list) {
          let order_item = data.menu_list[i]
          let menu = menu_data[order_item.id]
          let menu_item = {
            id: menu._id,
            type: menu.type,
            name: menu.name,
            cover: menu.cover,
            amount: order_item.amount,
            kitchen: menu.kitchen
          }
          if (menu.type == 'single') {
            menu_item.kitchen = menu.kitchen
            if (menu.model.active) {
              let temp = null
              menu.model.list.forEach(item => {
                if (item.name == order_item.model) {
                  temp = item
                }
              })
              if (temp == null) {
                return {
                  errcode: -1,
                  errmsg: '规格不存在'
                }
              } else {
                menu_item.model = temp.name
                menu_item.price = menu.price + temp.raise
              }
            } else {
              menu_item.price = menu.price
            }
            if (menu.option.active && order_item.option) {
              menu_item.option = order_item.option
            }
          } else if (menu.type == 'vary') {
            menu_item.kitchen = menu.kitchen
            menu_item.model = order_item.model
            menu_item.price = order_item.price
            if (menu.option.active && order_item.option) {
              menu_item.option = order_item.option
            }
          } else {
            menu_item.price = menu.price
            let combo = []
            for (let j in order_item.combo) {
              let item = order_item.combo[j]
              let menu2 = menu_data[item.id]
              if (item.option) {
                combo.push({
                  id: menu2._id,
                  name: menu2.name,
                  cover: menu2.cover,
                  kitchen: menu2.kitchen,
                  option: item.option
                })
              } else {
                combo.push({
                  id: menu2._id,
                  name: menu2.name,
                  cover: menu2.cover,
                  kitchen: menu2.kitchen
                })
              }
            }
            menu_item.combo = combo
          }
          if (menu.pack.money > 0) {
            if (menu.pack.mode == 'every') {
              pack_money += menu.pack.money * menu_item.amount
            } else {
              pack_money += menu.pack.money
            }
          }
          total_money += menu_item.price * menu_item.amount
          if (order_item.gift) {
            menu_item.gift = true
            reward_money += menu_item.price * menu_item.amount
          }
          if (order_item.remark) {
            let remark = order_item.remark.trim()
            if (remark.length > 0) {
              menu_item.remark = remark
            }
          }
          menu_list.push(menu_item)
        }
        for (let i in data.add_menu_list) {
          let order_item = data.add_menu_list[i]
          let menu = menu_data[order_item.id]
          let menu_item = {
            id: menu._id,
            type: menu.type,
            name: menu.name,
            cover: menu.cover,
            amount: order_item.amount,
            kitchen: menu.kitchen
          }
          if (menu.type == 'single') {
            menu_item.kitchen = menu.kitchen
            if (menu.model.active) {
              let temp = null
              menu.model.list.forEach(item => {
                if (item.name == order_item.form.model) {
                  temp = item
                }
              })
              if (temp == null) {
                return {
                  errcode: -1,
                  errmsg: '规格不存在'
                }
              } else {
                menu_item.model = temp.name
                menu_item.price = menu.price + temp.raise
              }
            } else {
              menu_item.price = menu.price
            }
            if (menu.option.active && order_item.form.option) {
              menu_item.option = order_item.form.option
            }
          } else if (menu.type == 'vary') {
            menu_item.kitchen = menu.kitchen
            menu_item.model = order_item.form.model
            menu_item.price = order_item.form.price
            if (menu.option.active && order_item.form.option) {
              menu_item.option = order_item.form.option
            }
          } else {
            menu_item.price = menu.price
            let combo = []
            for (let j in order_item.form.combo) {
              let item1 = order_item.form.combo[j]
              for (let k in item1) {
                let item2 = item1[k]
                let menu2 = menu_data[item2.id]
                if (item2.option) {
                  combo.push({
                    id: menu2._id,
                    name: menu2.name,
                    cover: menu2.cover,
                    kitchen: menu2.kitchen,
                    option: item2.option
                  })
                } else {
                  combo.push({
                    id: menu2._id,
                    name: menu2.name,
                    cover: menu2.cover,
                    kitchen: menu2.kitchen
                  })
                }
              }
            }
            menu_item.combo = combo
          }
          if (menu.pack.money > 0) {
            if (menu.pack.mode == 'every') {
              pack_money += menu.pack.money * menu_item.amount
            } else {
              pack_money += menu.pack.money
            }
          }
          total_money += menu_item.price * menu_item.amount
          if (order_item.form.gift) {
            menu_item.gift = true
            reward_money += menu_item.price * menu_item.amount
          }
          if (order_item.remark) {
            let remark = order_item.remark.trim()
            if (remark.length > 0) {
              menu_item.remark = remark
            }
          }
          menu_list.push(menu_item)
        }
        if (pack_money > 0) {
          total_money += pack_money
        }
        let update = {
          menu_list: menu_list,
          time_string: data.time_string,
          remark: data.remark,
          tableware: data.tableware,
          pack_money: pack_money,
          total_money: total_money,
          reward_money: reward_money,
          payable_money: total_money - reward_money,
          modify_sid: staff._id,
          modify_time: db.serverDate()
        }
        if (order.mode == 'delivery' && data.delivery_money) {
          update.delivery_money = data.delivery_money
          update.total_money = update.total_money + data.delivery_money
          update.payable_money = update.payable_money + data.delivery_money
        }
        await db.collection('outside_order').doc(order._id).update({
          data: update
        })
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

  async receive(id) {
    try {
      let self = this
      let staff = self.staff
      let config = self.config
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.state == 10) {
        let update = {
          state: 11,
          handle_sid: staff._id,
          handle_time: db.serverDate()
        }
        if (order.time_string == '0') {
          if (order.mode == 'delivery' && config.outside.delivery.auto_make) {
            update.state = 12
            update.make_time = db.serverDate()
          }
          if (order.mode == 'takeaway' && config.outside.takeaway.auto_make) {
            update.state = 12
            update.make_time = db.serverDate()
          }
        }
        res = await db.collection('outside_order').doc(order._id).update({
          data: update
        })
        if (update.state == 12) {
          await self.kitchen_print(order)
        }
        if (order.openid && config.outside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/outside/detail?id=' + order._id,
              data: {
                number11: {
                  value: order.order_sn
                },
                phrase10: {
                  value: update.state == 11 ? '商家接单' : '正在制作'
                },
                phrase9: {
                  value: '外卖订单'
                },
                date4: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing17: {
                  value: order.mode == 'delivery' ? '请耐心等待送餐!' : '请准时到店取餐!'
                }
              },
              templateId: config.outside.notify.template.success
            })
          } catch (err) { }
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

  async make(id) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        await db.collection('outside_order').doc(order._id).update({
          data: {
            state: 12,
            make_sid: staff._id,
            make_time: db.serverDate()
          }
        })
        await self.kitchen_print(order)
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
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.state > 10 && order.state < 20) {
        await db.collection('outside_order').doc(order._id).update({
          data: {
            state: 5,
            finish_sid: staff._id,
            finish_time: db.serverDate()
          }
        })
        if (order.openid && config.outside.notify.active) {
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

  async detail(sn) {
    let res = await db.collection('outside_order').where({
      is_deleted: false,
      order_sn: sn
    }).get()
    if (res.data.length) {
      return {
        errcode: 0,
        data: res.data[0]
      }
    } else {
      return {
        errcode: 0
      }
    }
  }

  async collect(id) {
    try {
      let self = this
      let user = self.user
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (!order.is_deleted) {
        if (order.openid) {
          return {
            errcode: -1,
            errmsg: '订单已被领取'
          }
        } else {
          res = await db.collection('outside_order').doc(order._id).update({
            data: {
              openid: user.openid,
              owner_uid: user._id
            }
          })
          return {
            errcode: 0
          }
        }
      } else {
        return {
          errcode: -1,
          errmsg: '订单无效'
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async refund(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.refund_state == 1) {
        return {
          errcode: -1,
          errmsg: '有退款未完成'
        }
      }
      if (order.payment_money-order.refund_money < data.money) {
        return {
          errcode: -1,
          errmsg: '超出退款金额'
        }
      } else {
        const transaction = await db.startTransaction()
        res = await transaction.collection('payment_refund').add({
          data: {
            openid: order.openid,
            order_id: order._id,
            order_type: 'outside',
            payment_id: order.payment_id,
            note: data.note,
            money: data.money,
            state: 0,
            refund_sid: staff._id,
            start_time: db.serverDate()
          }
        })
        await transaction.collection('outside_order').doc(order._id).update({
          data: {
            refund_state: 1,
            refund_money: _.inc(data.money)
          }
        })
        res = await cloud.callFunction({
          name: 'payment',
          data: {
            action: 'refund',
            trade_no: order.payment_id,
            refund_no: res._id,
            total_fee: order.payment_money, 
            refund_fee: data.money
          }
        })
        if (res.result.errcode == 0) {
          await transaction.commit()
          return {
            errcode: 0
          }
        } else {
          return {
            errcode: -1
          }
        }
      }
    } catch (err) {
      return {
        errcode: -1,
        errmsg: '操作失败'
      }
    }
  }

  async payment(order_id) {
    let res = await db.collection('outside_order').doc(order_id).get()
    let order = res.data
    let money = order.payable_money
    res = await db.collection('payment').add({
      data: {
        openid: order.openid,
        order_id: order._id,
        order_type: 'outside',
        type: 'wxpay',
        state: 0,
        money: money,
        start_time: db.serverDate()
      }
    })
    let payment_id = res._id
    res = await cloud.callFunction({
      name: 'payment',
      data: {
        action: 'unified',
        trade_no: payment_id, 
        body: '订单结账', 
        totalFee: money, 
        attach: 'outside'
      }
    })
    if (res.result.errcode == 0) {
      return {
        errcode: 0,
        payment_id: payment_id, 
        payment: res.result.payment
      }
    }
    return {
      errcode: -1,
      errmsg: '操作失败'
    }
  }

  async payment_success(payment_id) {
    try {
      let self = this
      let res = await cloud.callFunction({
        name: 'payment',
        data: {
          action: 'query',
          trade_no: payment_id
        }
      })
      if (res.result.errcode == 0) {
        const transaction = await db.startTransaction()
        res = await db.collection('payment').doc(payment_id).get()
        let payment = res.data
        if (payment.state==0) {
          await transaction.collection('outside_order').doc(payment.order_id).update({
            data: {
              state: 10,
              payment_id: payment._id,
              payment_type: payment.type,
              payment_money: payment.money
            }
          })
          await transaction.collection('payment').doc(payment_id).update({
            data: {
              state: 1,
              end_time: db.serverDate()
            }
          })
          await transaction.commit()
          await self.auto_order(payment.order_id)
        }
        return {
          errcode: 0
        }
      }
      return {
        errcode: -1
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async auto_order(id) {
    try {
      let self = this
      let config = self.config
      let res = await db.collection('outside_order').doc(id).get()
      let order = res.data
      if (order.mode == 'delivery') {
        if (config.outside.delivery.auto_receive) {
          order.state = 11
          let update = {
            state: 11,
            receive_time: db.serverDate()
          }
          if (order.time_string == '0' && config.outside.delivery.auto_make) {
            order.state = 12
            update.state = 12
            update.make_time = db.serverDate()
          }
          await db.collection('outside_order').doc(order._id).update({
            data: update
          })
        }
      } else if (order.mode == 'takeaway') {
        if (config.outside.takeaway.auto_receive) {
          order.state = 11
          let update = {
            state: 11,
            receive_time: db.serverDate()
          }
          if (order.time_string == '0' && config.outside.takeaway.auto_make) {
            order.state = 12
            update.state = 12
            update.make_time = db.serverDate()
          }
          await db.collection('outside_order').doc(order._id).update({
            data: update
          })
        }
      }
      if (config.outside.voucher.active) {
        await self.print_notice(order)
      }
      if (config.base.notify.active) {
        await self.wechat_notice(order.order_sn)
      }
      if (order.state > 10) {
        if (order.openid && config.outside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/outside/detail?id=' + order._id,
              data: {
                number11: {
                  value: order.order_sn
                },
                phrase10: {
                  value: order.state == 11 ? '商家接单' : '正在制作'
                },
                phrase9: {
                  value: '外卖订单'
                },
                date4: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing17: {
                  value: order.mode == 'delivery' ? '请耐心等待送餐!' : '请准时到店取餐!'
                }
              },
              templateId: config.outside.notify.template.success
            })
          } catch (err) { }
        }
        if (order.state == 12) {
          await self.kitchen_print(order)
        }
      }
    } catch (error) {}
  }

}

exports.main = async(event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const instance = Order.getInstace()
    switch (event.action) {
      case 'create_active':
        await instance.filterUser(wxContext.OPENID)
        await instance.getConfig()
        return await instance.create_active(event.data)
      case 'create_passive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.create_passive(event.data)
      case 'cancel_active':
        await instance.filterUser(wxContext.OPENID)
        return await instance.cancel_active(event.id, event.data)
      case 'cancel_passive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.cancel_passive(event.id, event.data)
      case 'remove':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.remove(event.id)
      case 'modify':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.modify(event.id, event.data)
      case 'receive':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.receive(event.id)
      case 'make':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.make(event.id)
      case 'finish':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        return await instance.finish(event.id)
      case 'detail':
        return await instance.detail(event.sn)  
      case 'collect':
        await instance.filterUser(wxContext.OPENID)
        return await instance.collect(event.id)
      case 'reprint':
        await instance.filterStaff(wxContext.OPENID)
        await instance.getConfig()
        let resOutside = await db.collection('outside_order').doc(event.id).get()
        return await instance.print_notice(resOutside.data)
      case 'refund':
        await instance.filterStaff(wxContext.OPENID)
        return await instance.refund(event.id,event.data)   
      case 'payment':
        return await instance.payment(event.id)  
      case 'payment_success':
        await instance.getConfig()
        return await instance.payment_success(event.payment_id)  
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