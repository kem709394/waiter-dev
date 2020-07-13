var v1 = function () {
  let date = new Date()
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let day = date.getDate()
  let hour = date.getHours()
  let minute = date.getMinutes()
  let second = date.getSeconds()
  let millisecond = date.getMilliseconds()
  let temp = year + ''
  temp += String(month).length < 2 ? '0' + month : month
  temp += String(day).length < 2 ? '0' + day : day
  temp += String(hour).length < 2 ? '0' + hour : hour
  temp += String(minute).length < 2 ? '0' + minute : minute
  temp += String(second).length < 2 ? '0' + second : second
  temp += millisecond
  temp += Math.floor(Math.random() * 10)
  temp += Math.floor(Math.random() * 10)
  temp += Math.floor(Math.random() * 10)
  temp += Math.floor(Math.random() * 10)
  return temp
}

module.exports = {
  v1: v1
}