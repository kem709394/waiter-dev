const db = wx.cloud.database()
Component({
	options: {
		multipleSlots: true,
		addGlobalClass: true
	},
	properties: {
		mode: {
			type: String,
			value: '1'
		},
		pack: {
			type: Boolean,
			value: false
		},
		gift: {
			type: Boolean,
			value: false
		},
		menu: {
			type: Object,
			value: null
		},
		show: {
			type: Boolean,
			value: false,
			observer: '_showChange'
		}
	},
	data: {
		form: {}
	},
	methods: {
		_showChange(value) {
			if (value) {
				let self = this
				let menu = self.data.menu
				if (menu) {
					let form = {
						pack: false,
						gift: false,
						date: new Date()
					}
					if (menu.option.active) {
						let option = []
						menu.option.list.forEach(i => {
							option.push(i.items[0])
						})
						form.option = option
					}
					self.setData({
						form: form
					})
				}
			}
		},
		inputChange(e) {
			let self = this
			if (e.currentTarget.dataset.rule) {
				self.setData({
					[e.currentTarget.dataset.rule]: e.detail.value,
					[e.currentTarget.dataset.field]: e.detail.value
				})
			} else {
				self.setData({
					[e.currentTarget.dataset.field]: e.detail.value
				})
			}
		},
		inputDigit(e) {
			let self = this
			let value = e.detail.value
			if (value.charAt(value.length - 1) != '.') {
				if (e.currentTarget.dataset.rule) {
					self.setData({
						[e.currentTarget.dataset.rule]: e.detail.value,
						[e.currentTarget.dataset.field]: Number(value)
					})
				} else {
					self.setData({
						[e.currentTarget.dataset.field]: Number(value)
					})
				}
			} else {
				if (e.currentTarget.dataset.rule) {
					self.setData({
						[e.currentTarget.dataset.rule]: e.detail.value
					})
				}
			}
		},
		packChange(e) {
			this.setData({
				'form.pack': e.detail.value
			})
		},
		giftChange(e) {
			this.setData({
				'form.gift': e.detail.value
			})
		},
		optionChange(e) {
			let self = this
			let option = self.data.form.option
			option[e.currentTarget.dataset.index] = e.currentTarget.dataset.value
			self.setData({
				'form.option': option
			})
		},
		scanPrice() {
			let self = this
			wx.scanCode({
				onlyFromCamera: true,
				scanType: ['qrCode'],
				success(res) {
					wx.showLoading({
						title: '正在查询',
						mask: true
					})
					db.collection('vary_price').doc(res.result).get().then(res => {
						if (res.data) {
							let time = moment(res.data.create_time).add(3, 'minutes')
							if (moment().isBefore(time)) {
								self.setData({
									'form.price': res.data.price,
									'form.model': res.data.model
								})
								wx.hideLoading()
							} else {
								wx.showToast({
									icon: 'none',
									title: '价格失效',
									duration: 2000
								})
							}
						} else {
							wx.showToast({
								icon: 'none',
								title: '非法操作',
								duration: 2000
							})
						}
					}).catch(err => {
						wx.showToast({
							icon: 'none',
							title: '系统繁忙',
							duration: 2000
						})
					})
				}
			})
		},
		addOrder() {
			let self = this
			let form = self.data.form
			if (self.data.mode == '1') {
				if (!form.model || !form.price) {
					wx.showToast({
						icon: 'none',
						title: '请先扫描价格码',
						duration: 2000
					})
					return
				}
			} else {
				if (!form.model || !form.price) {
					wx.showToast({
						icon: 'none',
						title: '请输入菜品价格和规格',
						duration: 2000
					})
					return
				}
				form.price = parseInt(form.price * 100)
			}
			self.setData({
				show: false
			})
			self.triggerEvent('addOrder', self.data.form)
		},
		close() {
			this.setData({
				show: false
			})
		},
		stopEvent() {}
	}
})