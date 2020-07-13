const cloud = require('wx-server-sdk')
const moment = require('moment')
const uuid = require('uuid')
const xlsx = require('xlsx')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

//统计数据
async function table_book(date_string) {
  try {
    let res = await db.collection('book_order')
      .aggregate()
      .match({
        is_deleted: false,
        state: _.and(_.gt(10), _.lt(20)),
        date_string: date_string
      })
      .limit(1000)
      .end()
    return {
      errcode: 0,
      list: res.list
    }
  } catch (err) {}
}

async function table_state() {
  try {
    let res = await db.collection('inside_order')
      .aggregate()
      .match({
        is_deleted: false,
        state: _.and(_.gte(10), _.lt(20)),
        table: _.exists(true)
      })
      .project({
        table: 1,
        state: 1,
        create_time: 1,
        make_time: 1
      })
      .limit(1000)
      .end()
    return {
      errcode: 0,
      list: res.list
    }
  } catch (err) {}
}

async function order_day(date_string, days) {
  let data = []
  try {
    if (date_string) {
      let item = {
        date_string: date_string,
        book: 0,
        inside: 0,
        outside: 0
      }
      let res = await db.collection('order_stat')
        .aggregate()
        .match({
          date_string: date_string
        })
        .end()
      if (res.list.length > 0) {
        res.list.forEach(temp => {
          item[temp.type] = temp.amount
        })
      }
      data.push(item)
    } else {
      let temp = moment()
      for (let i = days; i > 0; i--) {
        let tempString = moment(temp).subtract(i, 'days').format('YYYY-MM-DD')
        let item = {
          date_string: tempString,
          book: 0,
          inside: 0,
          outside: 0
        }
        let res = await db.collection('order_stat')
          .aggregate()
          .match({
            date_string: tempString
          })
          .end()
        if (res.list.length > 0) {
          res.list.forEach(temp => {
            item[temp.type] = temp.amount
          })
        }
        data.push(item)
      }
    }
  } catch (err) {}
  return data
}

async function order_month(date_string, months) {
  let data = []
  try {
    if (date_string) {
      let item = {
        date_string: date_string,
        book: 0,
        inside: 0,
        outside: 0
      }
      let res = await db.collection('order_stat')
        .aggregate()
        .addFields({
          dateIndex: $.indexOfBytes(['$date_string', date_string])
        })
        .match({
          dateIndex: 0
        })
        .group({
          _id: '$type',
          amount: $.sum('$amount')
        })
        .end()
      if (res.list.length > 0) {
        res.list.forEach(temp => {
          item[temp._id] = temp.amount
        })
      }
      data.push(item)
    } else {
      let temp = moment()
      for (let i = months; i > 0; i--) {
        let tempString = moment(temp).subtract(i - 1, 'months').format('YYYY-MM')
        let item = {
          date_string: tempString,
          book: 0,
          inside: 0,
          outside: 0
        }
        let res = await db.collection('order_stat')
          .aggregate()
          .addFields({
            dateIndex: $.indexOfBytes(['$date_string', tempString])
          })
          .match({
            dateIndex: 0
          })
          .group({
            _id: '$type',
            amount: $.sum('$amount')
          })
          .end()
        if (res.list.length > 0) {
          res.list.forEach(temp => {
            item[temp._id] = temp.amount
          })
        }
        data.push(item)
      }
    }
  } catch (err) {}
  return data
}

async function order_year(date_string, years) {
  let data = []
  try {
    if (date_string) {
      let item = {
        date_string: date_string,
        book: 0,
        inside: 0,
        outside: 0
      }
      let res = await db.collection('order_stat')
        .aggregate()
        .addFields({
          dateIndex: $.indexOfBytes(['$date_string', date_string])
        })
        .match({
          dateIndex: 0
        })
        .group({
          _id: '$type',
          amount: $.sum('$amount')
        })
        .end()
      if (res.list.length > 0) {
        res.list.forEach(temp => {
          item[temp._id] = temp.amount
        })
      }
      data.push(item)
    } else {
      let temp = moment().year()
      for (let i = years; i > 0; i--) {
        let tempString = String(temp - i + 1)
        let item = {
          date_string: tempString,
          book: 0,
          inside: 0,
          outside: 0
        }
        let res = await db.collection('order_stat')
          .aggregate()
          .addFields({
            dateIndex: $.indexOfBytes(['$date_string', tempString])
          })
          .match({
            dateIndex: 0
          })
          .group({
            _id: '$type',
            amount: $.sum('$amount')
          })
          .end()
        if (res.list.length > 0) {
          res.list.forEach(temp => {
            item[temp._id] = temp.amount
          })
        }
        data.push(item)
      }
    }
  } catch (err) {}
  return data
}

async function menu_stat(date_string) {
  let data = {}
  try {
    let res = await db.collection('menu_order_stat')
      .aggregate()
      .addFields({
        dateIndex: $.indexOfBytes(['$date_string', date_string])
      })
      .match({
        dateIndex: 0
      })
      .group({
        _id: '$mid',
        amount: $.sum('$amount')
      })
      .lookup({
        from: 'menu',
        localField: '_id',
        foreignField: '_id',
        as: 'menu'
      })
      .end()
    if (res.list.length > 0) {
      res.list.forEach(item => {
        data[item._id] = {
          name: item.menu[0].name,
          cover: item.menu[0].cover,
          amount: item.amount
        }
      })
    }
  } catch (err) {}
  return data
}

async function export_menu_stat(date_string) {
  try {
    let data = await menu_stat(date_string)
    if (data != null) {
      let aoa = [
        ['菜品', '销量']
      ]
      for (let key in data) {
        aoa.push([data[key].name, data[key].amount])
      }
      let res = await cloud.uploadFile({
        cloudPath: uuid() + '.xlsx',
        fileContent: sheet2blob(xlsx.utils.aoa_to_sheet(aoa), date_string + ' 销量统计')
      })
      if (res.fileID) {
        return {
          errcode: 0,
          fileID: res.fileID
        }
      }
    }
  } catch (err) {}
  return {
    errcode: -1
  }
}

async function delivery_stat(date_string, sid) {
  let data = {}
  try {
    if (sid) {
      let res = await db.collection('delivery_stat')
        .aggregate()
        .match({
          delivery_sid: sid
        })
        .addFields({
          dateIndex: $.indexOfBytes(['$date_string', date_string])
        })
        .match({
          dateIndex: 0
        })
        .group({
          _id: '$delivery_sid',
          amount: $.sum('$amount'),
          payable_money: $.sum('$payable_money'),
          delivery_money: $.sum('$delivery_money')
        })
        .lookup({
          from: 'staff',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        })
        .end()
      if (res.list.length > 0) {
        res.list.forEach(item => {
          data[item._id] = {
            full_name: item.staff[0].full_name,
            avatar: item.staff[0].avatar,
            amount: item.amount,
            payable_money: item.payable_money,
            delivery_money: item.delivery_money
          }
        })
      }
    } else {
      let res = await db.collection('delivery_stat')
        .aggregate()
        .addFields({
          dateIndex: $.indexOfBytes(['$date_string', date_string])
        })
        .match({
          dateIndex: 0
        })
        .group({
          _id: '$delivery_sid',
          amount: $.sum('$amount'),
          payable_money: $.sum('$payable_money'),
          delivery_money: $.sum('$delivery_money')
        })
        .lookup({
          from: 'staff',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        })
        .end()
      if (res.list.length > 0) {
        res.list.forEach(item => {
          data[item._id] = {
            full_name: item.staff[0].full_name,
            avatar: item.staff[0].avatar,
            amount: item.amount,
            payable_money: item.payable_money,
            delivery_money: item.delivery_money
          }
        })
      }
    }
  } catch (err) { }
  return data
}

async function export_delivery_stat(date_string, sid) {
  try {
    let data = await delivery_stat(date_string, sid)
    if (data != null) {
      let aoa = [
        ['姓名', '数量', '金额']
      ]
      for (let key in data) {
        aoa.push([data[key].full_name, data[key].amount, data[key].payable_money/100])
      }
      let res = await cloud.uploadFile({
        cloudPath: uuid() + '.xlsx',
        fileContent: sheet2blob(xlsx.utils.aoa_to_sheet(aoa), date_string + ' 配送统计')
      })
      if (res.fileID) {
        return {
          errcode: 0,
          fileID: res.fileID
        }
      }
    }
  } catch (err) { }
  return {
    errcode: -1
  }
}

function sheet2blob(sheet, sheetName) {
  sheetName = sheetName || 'sheet1'
  let workbook = {
    SheetNames: [sheetName],
    Sheets: {}
  }
  workbook.Sheets[sheetName] = sheet
  let wopts = {
    bookType: 'xlsx',
    bookSST: false,
    type: 'buffer'
  }
  return xlsx.write(workbook, wopts)
}

exports.main = async(event, context) => {
  try {
    switch (event.action) {
      case 'table_book':
        return await table_book(event.date_string)
      case 'table_state':
        return await table_state()
      case 'order_day':
        return await order_day(event.date_string, event.days)
      case 'order_month':
        return await order_month(event.date_string, event.months)
      case 'order_year':
        return await order_year(event.date_string, event.years)
      case 'menu_stat':
        return await menu_stat(event.date_string)
      case 'export_menu_stat':
        return await export_menu_stat(event.date_string)
      case 'delivery_stat':
        return await delivery_stat(event.date_string, event.sid)
      case 'export_delivery_stat':
        return await export_delivery_stat(event.date_string, event.sid)
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