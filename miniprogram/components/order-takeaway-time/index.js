const app = getApp()
const moment = require('../../utils/moment.min.js')

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'shared'
  },
  properties: {
    default: {
      type: String,
      value: '马上到店'
    }
  },
  data: {
    show: false,
    title: '',
    soon: false,
    days: [],
    times: [],
    minVal: [0, 0],
    maxVal: [0, 0],
    tempVal: [0, 0],
    current: [0, 0],
    dialog: false
  },
  lifetimes: {
    attached() {
      let self = this
      let days = []
      let times = []
      let soon = false
      let advance = app.globalData.config.outside.takeaway.advance
      let timerange = app.globalData.config.outside.takeaway.timerange
      timerange.forEach(item => {
        let temp = item.start
        while (temp < item.end) {
          times.push(temp.toString().padStart(2, '0') + ':00')
          times.push(temp.toString().padStart(2, '0') + ':20')
          times.push(temp.toString().padStart(2, '0') + ':40')
          temp++
        }
        let startTime = moment().set('hour', item.start)
        let endTime = moment().set('hour', item.end)
        if (moment().isBetween(startTime, endTime)) {
          soon = true
        }
      })
      let count = 0
      let minVal = null
      let maxVal = null
      let currTime = moment()
      let tempTime = moment()
      let lastTime = moment().add(advance, 'minutes')
      while (tempTime.isBefore(lastTime)) {
        let flag = false
        times.forEach((item, index) => {
          let time = item.split(':')
          tempTime.set('hour', parseInt(time[0]))
          tempTime.set('minute', parseInt(time[1]))
          if (tempTime.isBefore(lastTime)) {
            if (tempTime.isAfter(currTime)) {
              if (minVal == null) {
                minVal = [0, index]
              }
              flag = true
            }
            maxVal = flag ? [days.length, index] : [days.length - 1, index]
          }
        })
        if (flag) {
          if (count == 0) {
            days.push({
              title: '今天 ',
              value: tempTime.format('MM-DD ')
            })
          } else if (count == 1) {
            days.push({
              title: '明天 ',
              value: tempTime.format('MM-DD ')
            })
          } else {
            days.push({
              title: tempTime.format('M月D日 '),
              value: tempTime.format('MM-DD ')
            })
          }
        }
        count++
        tempTime.set('hour', 0)
        tempTime.set('minute', 0)
        tempTime.add(1, 'days')
      }
      if (days.length > 0) {
        if (soon) {
          self.setData({
            soon: true,
            days: days,
            times: times,
            current: minVal,
            minVal: minVal,
            maxVal: maxVal,
            title: self.data.default
          })
          self.triggerEvent('affirm', {
            value: '0'
          })
        } else {
          self.setData({
            days: days,
            times: times,
            current: minVal,
            minVal: minVal,
            maxVal: maxVal,
            title: days[minVal[0]].title + times[minVal[1]]
          })
          self.triggerEvent('affirm', {
            value: days[minVal[0]].value + times[minVal[1]]
          })
        }
      }
    }
  },
  methods: {
    atSoon() {
      let self = this
      self.setData({
        show: false,
        title: self.data.default,
        current: self.data.minVal
      })
      self.triggerEvent('affirm', {
        value: '0'
      })
    },
    timeChange(e) {
      let self = this
      let value = e.detail.value
      let minVal = self.data.minVal
      let maxVal = self.data.maxVal
      if (value[0] * 100 + value[1] < minVal[0] * 100 + minVal[1]) {
        self.setData({
          tempVal: self.data.minVal
        })
      } else if (value[0] * 100 + value[1] > maxVal[0] * 100 + maxVal[1]) {
        self.setData({
          tempVal: self.data.maxVal
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
      if (self.data.days.length > 0) {
        self.setData({
          show: true,
          tempVal: self.data.current
        })
      } else {
        self.setData({
          dialog: true
        })
      }
    },
    close(e) {
      this.setData({
        show: false
      })
    },
    tapDialog() {
      this.setData({
        dialog: false
      })
    }
  }
})