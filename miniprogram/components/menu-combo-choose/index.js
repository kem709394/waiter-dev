const tools = require('../../utils/tools.js')
Component({
	options: {
		multipleSlots: true,
		addGlobalClass: true
	},
	properties: {
		pack: {
			type: Boolean,
			value: false
		},
		gift: {
			type: Boolean,
			value: false
		},
		data: {
			type: Object,
			value: null
		},
		menu: {
			type: Object,
			value: null
		},
		count: {
			type: Object,
			value: null
		},
		remain: {
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
		form: {},
		child: {
			show: false,
			form: {},
			index1: null,
			index2: null
		}
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
						price: menu.price,
						combo: new Array(menu.combo.length)
					}
					menu.combo.forEach((option, index) => {
						form.combo[index] = new Array(option.amount)
					})
					self.setData({
						form: form
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
			let option = self.data.child.form.option
			option[e.currentTarget.dataset.index] = e.currentTarget.dataset.value
			self.setData({
				'child.form.option': option
			})
		},
		menuChange(e) {
			let self = this
			let id = e.currentTarget.dataset.id
			let menu = self.data.data[id]
			let form = {
				id: menu._id
			}
			if (menu.option.active) {
				let option = []
				menu.option.list.forEach(i => {
					option.push(i.items[0])
				})
				form.option = option
			}
			self.setData({
				'child.form': form
			})
		},
		chooseItem(e) {
			let self = this
			let index1 = e.currentTarget.dataset.index1
			let index2 = e.currentTarget.dataset.index2
			let form = self.data.form
			if (form.combo[index1][index2]) {
				self.setData({
					'child.form': tools.objCopy(form.combo[index1][index2]),
					'child.index1': index1,
					'child.index2': index2,
					'child.show': true
				})
			} else {
				self.setData({
					'child.form': null,
					'child.index1': index1,
					'child.index2': index2,
					'child.show': true
				})
			}
		},
		cancelItem() {
			this.setData({
				show: true,
				'child.show': false
			})
		},
		confirmItem() {
			let self = this
			let child = self.data.child
			if (child.form == null) {
				wx.showToast({
					icon: 'none',
					title: '请选择菜品',
					duration: 2000
				})
				return
			}
			let form = self.data.form
			form.combo[child.index1][child.index2] = child.form
			self.setData({
				form: form,
				'child.show': false
			})
		},
		addOrder() {
			let self = this
			let lack = false
			let combo = self.data.form.combo
			for (let i = 0; i < combo.length; i++) {
				for (let j = 0; j < combo[i].length; j++) {
					if (combo[i][j] == undefined) {
						lack = true
						break
					}
				}
			}
			if (lack) {
				wx.showToast({
					icon: 'none',
					title: '请选择套餐菜品',
					duration: 2000
				})
				return
			}
			self.setData({
				show: false
			})
			self.triggerEvent('addOrder', self.data.form)
		},
		close() {
			this.setData({
				show: false,
				'child.show': false
			})
		},
		stopEvent() {}
	}
})