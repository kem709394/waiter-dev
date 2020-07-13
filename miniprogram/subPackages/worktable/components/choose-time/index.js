const moment = require('../../../../utils/moment.min.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true
  },
  properties: {
    limit: {
      type: Number,
      value: 5
    },
    default: {
      type: String,
      value: '请选择时间'
    },
    value: {
      type: String,
      value: ''
    }
  },
  data: {
    show: false,
    days: [],
    times: [],
    title: '',
    tempVal: [0, 0],
    current: [0, 0]
  },
  lifetimes: {
    attached() {
      let self = this
      let days = []
      let times = []
      let temp = 0
      let date = moment()
      while (temp < self.data.limit) {
        date.add(temp, 'days')
        if (temp == 0) {
          days.push({
            title: '今天 ',
            value: date.format('MM-DD ')
          })
        } else if (temp == 1) {
          days.push({
            title: '明天 ',
            value: date.format('MM-DD ')
          })
        } else {
          days.push({
            title: date.format('M月D日 '),
            value: date.format('MM-DD ')
          })
        }
        temp++
      }
      temp = 0
      while (temp < 24) {
        times.push(temp.toString().padStart(2, '0') + ':00')
        times.push(temp.toString().padStart(2, '0') + ':20')
        times.push(temp.toString().padStart(2, '0') + ':40')
        temp++
      }
      let value = self.data.value
      let title = self.data.default
      let current = [0, 0]
      if (value=='' || value=='0') {
        if (value=='') {
          title = '请选择时间'
        } else {
          title = self.data.default
        }
        let flag = false
        times.forEach((item, index)=>{
          if (moment().isBefore(moment(item, 'HH:mm'))) {
            if (!flag) {
              flag = true
              current = [0, index]
            }
          }
        })
        if (!flag) {
          current = [1, 0]
        }
      } else {
        let array = self.data.value.split(' ')
        days.forEach((item, index)=>{
          if (item.value.indexOf(array[0])==0) {
            current = [index, times.indexOf(array[1])]
            title = days[index].title+array[1]
            if (moment().isAfter(moment(days[index].value+array[1], 'MM-DD HH:mm'))) {
              title += '（已过期）'
            }
          }
        })
      }
      self.setData({
        days: days,
        times: times,
        title: title,
        current: current
      })
    }
  },
  methods: {
    timeChange(e) {
      let self = this
      let value = e.detail.value
      let times = self.data.times
      let tempTime = moment(times[value[1]], 'HH:mm')
      if (moment().isAfter(tempTime)) {
        let flag = false
        self.data.times.forEach((item, index)=>{
          if (moment().isBefore(moment(item, 'HH:mm'))) {
            if (!flag) {
              flag = true
              value[1] = index
              self.setData({
                tempVal: value
              })
            }
          }
        })
      } else {
        self.setData({
          tempVal: value
        })
      }
    },
    affirm() {
      let self = this
      let tempVal = self.data.tempVal
      let day = self.data.days[tempVal[0]]
      let time = self.data.times[tempVal[1]]
      self.setData({
        show: false,
        title: day.title + time,
        current: tempVal
      })
      self.triggerEvent('affirm', {
        value: day.value + time
      })
    },
    open() {
      let self = this
      self.setData({
        show: true,
        tempVal: self.data.current
      })
    },
    close(e) {
      this.setData({
        show: false
      })
    }
  }
})