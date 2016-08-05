function Debouncer(lifetime){
	var buffer = [];

	this.check = function(payload){
		if(present(payload) >= 0){
			refresh(payload);
			return true;
		}else{
			add(payload);
			return false;
		}
	};
	
	this.list = function(){
		console.log('buffer contains:')
		buffer.forEach(function(element){
			console.log(element.data);
		});
	};

	function add(payload){
		var timeout = setTimeout(function(){
			buffer.splice(present(payload), 1);
		}, lifetime);
		buffer.push({
			data: payload, 
			timeout: timeout
		});
	};
	
	function present(payload){
		var matches = buffer.filter(function(d){
			return d.data == payload; 
		});	
		return buffer.indexOf(matches[0]);
	};

	function refresh(payload){
		clearTimeout(buffer[present(payload)].timeout);
		buffer.splice(present(payload), 1);
		add(payload);
	};
}

module.exports = Debouncer;