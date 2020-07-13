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
						price: menu.price,
						raise: 0
					}
					if (menu.model.active) {
						form.model = menu.model.list[0].name
						form.raise = menu.model.list[0].raise
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
		modelChange(e) {
			let self = this
			let menu = self.data.menu
			let form = self.data.form
			let item = tools.getItem(menu.model.list, 'name', e.currentTarget.dataset.name)
			form.model = item.name
			form.raise = item.raise
			self.setData({
				form: form
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
		addOrder() {
			let self = this
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