const uuid = require('../../../../utils/uuid.js')

Component({
  properties: {
    value: {
      type: String,
      value: '',
      observer: '_valueChange'
    },
    placeholder: {
      type: String,
      value: '请输入内容...'
    },
    readOnly: {
      type: Boolean,
      value: false
    }
  },
  data: {
    ready: false,
    content: '',
    formats: {}
  },
  methods: {
    _valueChange(value) {
      let self = this
      if (!self.data.ready) {
        self.setData({
          ready: true,
          content: value
        })
        self.setContent(value)
      }
    },
    onEditorReady() {
      this.setContent(this.properties.content)
    },
    onInput(e) {
      this.triggerEvent('change', e.detail)
    },
    onStatusChange(e) {
      let formats = e.detail
      this.setData({ formats })
    },
    setContent(content) {
      let self = this
      self.createSelectorQuery().select('.ql-container').context(function (res) {
        self.editorCtx = res.context
        self.editorCtx.setContents({
          html: content
        })
      }).exec()
    },
    undo() {
      this.editorCtx.undo()
    },
    redo() {
      this.editorCtx.redo()
    },
    format(e) {
      let { name, value } = e.target.dataset
      if (!name) return
      this.editorCtx.format(name, value)
    },
    insertDivider() {
      this.editorCtx.insertDivider({
        success: function () {
          console.log('insert divider success')
        }
      })
    },
    clear() {
      this.editorCtx.clear({
        success: function (res) {
          console.log("clear success")
        }
      })
    },
    removeFormat() {
      this.editorCtx.removeFormat()
    },
    insertDate() {
      let date = new Date()
      this.editorCtx.insertText({
        text: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
      })
    },
    insertImage() {
      let self = this
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          wx.showLoading({
            title: '正在上传',
            mask: true
          })
          let filePath = res.tempFilePaths[0]
          let suffix = filePath.substring(filePath.lastIndexOf('.'), filePath.length)
          wx.cloud.uploadFile({
            cloudPath: uuid.v1() + suffix,
            filePath: filePath,
            success: res => {
              wx.hideLoading()
              self.editorCtx.insertImage({
                src: res.fileID,
                success: function () {
                  console.log('insert image success')
                }
              })
            },
            fail: console.error
          })
        }
      })
    }
  }
})
