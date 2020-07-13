const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const moment = require('moment')

//点餐服务功能
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

  async sync_menu_sku(mode, menu_list) {
    try {
      const transaction = await db.startTransaction()
      for (let key1 in menu_list) {
        let item1 = menu_list[key1]
        let amount = item1.amount
        await transaction.collection('menu').doc(item1.id).update({
          data: {
            'statistics.sales': _.inc(mode == '-' ? amount : -amount),
            'sku.count': _.inc(mode == '-' ? amount : -amount)
          }
        })
        if (item1.combo) {
          for (let key2 in item1.combo) {
            let item2 = item1.combo[key2]
            await transaction.collection('menu').doc(item2.id).update({
              data: {
                'statistics.sales': _.inc(mode == '-' ? amount : -amount),
                'sku.count': _.inc(mode == '-' ? amount : -amount)
              }
            })
          }
        }
      }
      await transaction.commit()
    } catch (err) {
      throw new Error('error!')
    }
  }

  async kitchen_print(order) {
    try {
      let kitchen = {}
      let res = await db.collection('kitchen').where({
        is_deleted: false
      }).get()
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
                  value: '点餐订单'
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
      if (order.table) {
        page_text += `<FS><center>餐桌#${order.table}</center></FS>`
      }
      page_text += `<FB>订单编号:${order.order_sn}</FB>\r\n`
      page_text += `<FB>下单时间:${moment(order.create_time).format('YYYY-MM-DD HH:mm')}</FB>\r\n`
      if (order.mode == 'reserve') {
        let contacts = order.contacts
        page_text += `<FB>客户电话:${contacts.mobile}</FB>\r\n`
        page_text += `<FB>预定时间:${order.time_string}</FB>\r\n`
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
        if (item1.pack) {
          title += '(打包)'
        }
        if (item1.gift) {
          title += '(赠品)'
        }
        menu_text += `\r\n<FS><FB>${title} x${item1.amount}</FB></FS>\r\n`
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
      if (order.seat_count > 0) {
        fee_text += `<LR>餐位费用,x${order.seat_count}     ￥${order.seat_price * order.seat_count / 100}</LR>`
      }
      if (order.pack_money > 0) {
        fee_text += `<LR>打包费用,￥${order.pack_money / 100}</LR>`
      }
      fee_text += `<LR>合计金额,￥${order.total_money / 100}</LR>`
      if (order.discount_money) {
        fee_text += `<LR>赠送金额,￥${order.discount_money / 100}</LR>`
        fee_text += `<LR>应付金额,￥${order.payable_money / 100}</LR>`
      }
      page_text += `<FB>${fee_text}</FB>`
      for (let i = 0; i < config.inside.voucher.printer.length; i++) {
        let content = `<MN>${config.inside.voucher.printer[i].page}</MN>`
        content += page_text
        if (order.payment_state == 2) {
          content += `<FS2><center>**** 已付款 ****</center></FS2>`
        } else {
          content += `<FS2><center>****** 完 ******</center></FS2>`
        }
        content += `<center>*************订单码*************</center>`
        content += `<QR>${order._id}</QR>`
        content += `<center>技术:白马为科技</center><audio>有新的点餐订单,5,0</audio>`
        try {
          await cloud.callFunction({
            name: 'printer',
            data: {
              action: 'print',
              id: config.inside.voucher.printer[i].id,
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
      let user = self.user
      let config = self.config
      let menu_data = {}
      let menu_list = []
      let pack_money = 0
      let total_money = 0
      let seat_price = config.inside.seat.price
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
        if (order_item.form.pack) {
          menu_item.pack = true
          if (menu.pack.money > 0) {
            if (menu.pack.mode == 'every') {
              pack_money += menu.pack.money * menu_item.amount
            } else {
              pack_money += menu.pack.money
            }
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
      total_money += seat_price * data.seat_count
      total_money += pack_money
      let order = {
        openid: user.openid,
        owner_uid: user._id,
        mode: data.mode,
        order_sn: self.genOrderSn(),
        menu_list: menu_list,
        remark: data.remark,
        seat_count: data.seat_count,
        seat_price: seat_price,
        pack_money: pack_money,
        total_money: total_money,
        payable_money: total_money,
        is_deleted: false,
        state: 0,
        payment_money: 0,
        refund_state: 0,
        refund_money: 0,
        create_uid: user._id,
        create_time: db.serverDate()
      }
      if (order.mode == 'arrival') {
        order.table = data.table
        if (!config.inside.arrival.payment) {
          order.state = 10
        }
      } else if (order.mode == 'reserve') {
        order.time_string = data.time_string
        order.contacts = data.contacts
        if (!config.inside.reserve.payment) {
          order.state = 10
        }
      }
      res = await db.collection('inside_order').add({
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
      let staff = self.staff
      let config = self.config
      let menu_data = {}
      let menu_list = []
      let pack_money = 0
      let total_money = 0
      let reward_money = 0
      let seat_price = config.inside.seat.price
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
        if (order_item.form.pack) {
          menu_item.pack = true
          if (menu.pack.money > 0) {
            if (menu.pack.mode == 'every') {
              pack_money += menu.pack.money * menu_item.amount
            } else {
              pack_money += menu.pack.money
            }
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
      total_money += seat_price * data.seat_count
      if (pack_money > 0) {
        total_money += pack_money
      }
      let order = {
        mode: data.mode,
        order_sn: self.genOrderSn(),
        contacts: data.contacts,
        menu_list: menu_list,
        remark: data.remark,
        seat_count: data.seat_count,
        seat_price: seat_price,
        pack_money: pack_money,
        total_money: total_money,
        reward_money: reward_money,
        payable_money: total_money - reward_money,
        is_deleted: false,
        state: 10,
        payment_money: 0,
        refund_state: 0,
        refund_money: 0,
        create_uid: '0',
        create_sid: staff._id,
        create_time: db.serverDate(),
        receive_sid: staff._id,
        receive_time: db.serverDate()
      }
      if (order.mode == 'arrival') {
        order.table = data.table
      } else if (order.mode == 'reserve') {
        order.time_string = data.time_string
        order.contacts = data.contacts
      }
      res = await db.collection('inside_order').add({
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
      let res = await db.collection('inside_order').doc(id).get()
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
              order_type: 'inside',
              payment_id: order.payment_id,
              note: '取消订单',
              money: order.payment_money,
              state: 0,
              start_time: db.serverDate()
            }
          })
          update.refund_state = 1
          update.refund_money =  order.payment_money
          await transaction.collection('inside_order').doc(order._id).update({
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
          await db.collection('inside_order').doc(order._id).update({
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
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.state >= 10 && order.state < 20) {
        await db.collection('inside_order').doc(order._id).update({
          data: {
            state: 42,
            cancel_note: data.note,
            cancel_time: db.serverDate(),
            cancel_sid: staff._id
          }
        })
        await self.sync_menu_sku('+', order.menu_list)
        if (order.openid && config.inside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/inside/detail?id=' + order._id,
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
              templateId: config.inside.notify.template.cancel
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
      await db.collection('inside_order').doc(id).update({
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
      let config = self.config
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.state > 10 && order.state < 20) {
        let menu_data = {}
        let menu_list = []
        let pack_money = 0
        let total_money = 0
        let reward_money = 0
        let seat_price = config.inside.seat.price
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
            amount: order_item.amount
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
              let menu2 = await db.collection('menu').doc(item.id).get()
              if (item.option) {
                combo.push({
                  id: menu2.data._id,
                  name: menu2.data.name,
                  cover: menu2.data.cover,
                  kitchen: menu2.data.kitchen,
                  option: item.option
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
            menu_item.combo = combo
          }
          if (order_item.pack) {
            menu_item.pack = true
            if (menu.pack.money > 0) {
              if (menu.pack.mode == 'every') {
                pack_money += menu.pack.money * menu_item.amount
              } else {
                pack_money += menu.pack.money
              }
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
          if (order_item.form.pack) {
            menu_item.pack = true
            if (menu.pack.money > 0) {
              if (menu.pack.mode == 'every') {
                pack_money += menu.pack.money * menu_item.amount
              } else {
                pack_money += menu.pack.money
              }
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
        total_money += seat_price * data.seat_count
        if (pack_money > 0) {
          total_money += pack_money
        }
        let update = {
          menu_list: menu_list,
          seat_count: data.seat_count,
          seat_price: seat_price,
          remark: data.remark,
          pack_money: pack_money,
          total_money: total_money,
          reward_money: reward_money,
          payable_money: total_money - reward_money,
          modify_sid: staff._id,
          modify_time: db.serverDate()
        }
        if (data.table) {
          update.table = data.table
        }
        if (data.time_string) {
          update.time_string = data.time_string
        }
        await db.collection('inside_order').doc(order._id).update({
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
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.state == 10) {
        let update = {
          state: 11,
          receive_sid: staff._id,
          receive_time: db.serverDate()
        }
        if (order.mode == 'arrival' && config.inside.arrival.auto_make) {
          update.state = 12
          update.make_time = db.serverDate()
        }
        res = await db.collection('inside_order').doc(id).update({
          data: update
        })
        if (update.state == 12) {
          await self.kitchen_print(order)
        }
        if (config.inside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/inside/detail?id=' + order._id,
              data: {
                number11: {
                  value: order.order_sn
                },
                phrase10: {
                  value: update.state == 11 ? '商家接单' : '正在制作'
                },
                phrase9: {
                  value: '点餐订单'
                },
                date4: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing17: {
                  value: order.mode == 'reserve' ? '请准时到店就餐!' : '请不要随意换餐桌!'
                }
              },
              templateId: config.inside.notify.template.success
            })
          } catch (err) { }
        }
        return {
          errcode: 0
        }
      } else {
        return {
          errcode: -1,
          errmsg: '非法操作'
        }
      }
    } catch (err) {
      throw new Error('error!')
    }
  }

  async make(id, data) {
    try {
      let self = this
      let staff = self.staff
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.state == 11) {
        res = await db.collection('inside_order').doc(order._id).update({
          data: {
            state: 12,
            table: data.table,
            make_sid: staff._id,
            make_time: db.serverDate()
          }
        })
        order.table = data.table
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
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.state > 10 && order.state < 20) {
        await db.collection('inside_order').doc(order._id).update({
          data: {
            state: 5,
            finish_sid: staff._id,
            finish_time: db.serverDate()
          }
        })
        if (order.openid) {
          if (config.inside.notify.active) {
            try {
              await cloud.openapi.subscribeMessage.send({
                touser: order.openid,
                page: 'pages/order/inside/detail?id=' + order._id,
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
                templateId: config.inside.notify.template.finish
              })
            } catch (err) { }
          }
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
    let res = await db.collection('inside_order').where({
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
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (!order.is_deleted) {
        if (order.openid) {
          return {
            errcode: -1,
            errmsg: '订单已被领取'
          }
        } else {
          res = await db.collection('inside_order').doc(order._id).update({
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
      let res = await db.collection('inside_order').doc(id).get()
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
            order_type: 'inside',
            payment_id: order.payment_id,
            note: data.note,
            money: data.money,
            state: 0,
            refund_sid: staff._id,
            start_time: db.serverDate()
          }
        })
        await transaction.collection('inside_order').doc(order._id).update({
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
    let res = await db.collection('inside_order').doc(order_id).get()
    let order = res.data
    let money = order.payable_money
    res = await db.collection('payment').add({
      data: {
        openid: order.openid,
        order_id: order._id,
        order_type: 'inside',
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
        attach: 'inside'
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
          await transaction.collection('inside_order').doc(payment.order_id).update({
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
      let res = await db.collection('inside_order').doc(id).get()
      let order = res.data
      if (order.mode == 'arrival') {
        if (config.inside.arrival.auto_receive) {
          order.state = 11
          let update = {
            state: 11,
            receive_time: db.serverDate()
          }
          if (config.inside.arrival.auto_make) {
            order.state = 12
            update.state = 12
            update.make_time = db.serverDate()
          }
          await db.collection('inside_order').doc(order._id).update({
            data: update
          })
        }
      } else if (order.mode == 'reserve') {
        if (config.inside.reserve.auto_receive) {
          order.state = 11
          await db.collection('inside_order').doc(order._id).update({
            data: {
              state: 11,
              receive_time: db.serverDate()
            }
          })
        }
      }
      if (config.inside.voucher.active) {
        await self.print_notice(order)
      }
      if (config.base.notify.active) {
        await self.wechat_notice(order.order_sn)
      }
      if (order.state > 10) {
        if (config.inside.notify.active) {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: order.openid,
              page: 'pages/order/inside/detail?id=' + order._id,
              data: {
                number11: {
                  value: order.order_sn
                },
                phrase10: {
                  value: order.state == 11 ? '商家接单' : '正在制作'
                },
                phrase9: {
                  value: '点餐订单'
                },
                date4: {
                  value: moment(order.create_time).format('YYYY-MM-DD HH:mm')
                },
                thing17: {
                  value: order.mode == 'reserve' ? '请准时到店就餐!' : '请不要随意换餐桌!'
                }
              },
              templateId: config.inside.notify.template.success
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
        return await instance.make(event.id, event.data)
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
        let resInside = await db.collection('inside_order').doc(event.id).get()
        return await instance.print_notice(resInside.data)
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