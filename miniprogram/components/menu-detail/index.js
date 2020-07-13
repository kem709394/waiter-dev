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
			value: false
		}
	},
	methods: {
		showLack() {
			wx.showToast({
				icon: 'none',
				title: '当前菜品备料不足',
				duration: 2000
			})
		},
		chooseMenu() {
			let self = this
			self.setData({
				show: false
			})
			self.triggerEvent('chooseMenu')
		},
		addAmount() {
			this.triggerEvent('addAmount')
		},
		subAmount() {
			this.triggerEvent('subAmount')
		},
		close() {
			this.setData({
				show: false
			})
		},
		stopEvent() {}
	}
})