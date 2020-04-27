// B"H.
class Zachin {
	data() {
		return {
			permalink: "items.json",
		};
	}

	render(data) {
		return JSON.stringify(data.items.dict, null, "    ");
	}
}

module.exports = Zachin;
