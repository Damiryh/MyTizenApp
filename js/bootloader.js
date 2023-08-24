/*

function sendMessage(level, msg) {
	var xhr = new XMLHttpRequest();
	var url = new URL('http://192.168.88.250/logging/');
	url.search = "?lvl=" + level + "&msg=" + msg;
	xhr.open('GET', url);
	xhr.send();
}

console.log = function(message) {
	sendMessage("log", message);
}

console.warn = function(message) {
	sendMessage("warn", message);
}

console.error = function(message) {
	sendMessage("err", message);
}

*/


function loadCSS(path) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		var url = new URL(PORTAL_URL + path);
		xhr.open('GET', url);
		xhr.send();
		
		xhr.onload = function () {
			if (xhr.status != 200) {
				reject();
				return;
			}
			
			var st = document.createElement('style');
			st.appendChild(document.createTextNode(xhr.response));
			st.type = "text/css";
			
			var head = document.getElementsByTagName('head')[0];
			head.appendChild(st);
			
			resolve();
		};
	});
}

UI_TEMPLATES = {};

function loadHTML(path, name) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		var url = new URL(PORTAL_URL + path);
		xhr.open('GET', url);
		xhr.send();
		
		xhr.onload = function () {
			if (xhr.status != 200) {
				reject();
				return;
			}
			
			resolve({ 'name': name, 'text': xhr.response });
		};
	});
}

const portalLoadEvent = new Event('portalLoad', { bubbles: true });

function boot() {
	loadCSS('/css/style.css')
	.then(() => { loadCSS('/css/ui.css'); });
	
	loadJS('/js/greet.js')
	.then(() => {
		return Promise.all([
			loadHTML('/templates/progressBar.html', 'progressBar'),
			loadHTML('/templates/infoBar.html', 'infoBar'),
			loadHTML('/templates/episodeListMenu.html', 'episodeListMenu'),
			loadHTML('/templates/episodeMenu.html', 'episodeMenu'),
			loadHTML('/templates/episodeItem.html', 'episodeItem'),
			loadHTML('/templates/seasonMenu.html', 'seasonMenu'),
			loadHTML('/templates/seasonItem.html', 'seasonItem'),
			loadHTML('/templates/player.html', 'player')
		])
		.then( templates => {
			for (var template of templates) {
				UI_TEMPLATES[template.name] = template.text;
			}
		});
	})
	.then(() => { return loadJS('/js/ui.js'); })
	.then(() => { return loadJS('/js/main.js'); })
	.then(() => { return init_tvmw_portal(); })
	.then(() => { window.dispatchEvent(portalLoadEvent); });
}

function reload() {
	var xhr = new XMLHttpRequest();
	var url = new URL('http://192.168.88.250/index.html');
	xhr.open('GET', url);
	xhr.send();
	
	xhr.onload = function() {
		webapis.avplay.stop();
		webapis.avplay.close();
		Collector = undefined;
		UI = undefined;
		
		document.open();
		document.clear();
		document.write(xhr.response);
		document.close();
	};
}