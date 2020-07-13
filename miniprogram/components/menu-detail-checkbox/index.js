Component({
	options: {
		multipleSlots: true,
		addGlobalClass: true
	},
	properties: {
		menu: {
			type: Object,
			value: null
		},
		remain: {
			type: Object,
			value: null
		},
		checked: {
			type: Boolean,
			value: false
		},
		show: {
			type: Boolean,
			value: false
		}
	},
	methods: {
		toggle() {
			this.triggerEvent('toggle')
		},
		close() {
			this.setData({
				show: false
			})
		},
		stopEvent() {}
	}
})