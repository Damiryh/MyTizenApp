UI = {};

const UIElement = {
	bind: function(owner) {
		this._owner = owner;
		this._owner.appendChild(this._root);
	},
	
	unbind: function() {
		this._owner.removeChild(this._root);
	},
	
	show: function() {
		this._root.classList.remove('hidden');
	},
	
	hide: function() {
		this._root.classList.add('hidden');
	},
};

//======================================================================

function getHumanTime(t) {
	var hours = Math.floor(t/3600000);
	var minutes = Math.floor((t - hours*3600000)/60000);
	var seconds = Math.floor((t - minutes*60000)/1000);
	
	return ('00' + String(hours)).slice(-2) + ":" + 
		('00' + String(minutes)).slice(-2) + ":" +
		('00' + String(seconds)).slice(-2);
}

function createUIElementFromHTML(template_name) {
	var container = document.createElement('div');
	container.innerHTML = UI_TEMPLATES[template_name];
	return container.firstChild;
}

//======================================================================

function Player() {
	this.__proto__ = UIElement;
	
	this._root = createUIElement('player');
};



function ProgressBar() {
	this.__proto__ = UIElement;
	
	this.currentTime = 0;
	this.duration = 0;
	
	this._root = createUIElementFromHTML('progressBar');
	this._progress = this._root.getElementsByClassName('player-pb')[0];
	this._currentTimeLabel = this._root.getElementsByClassName('player-pb-ct')[0];
	this._durationLabel = this._root.getElementsByClassName('player-pb-d')[0];
	
	this.setDuration = function(duration) {
		this.duration = duration;
		this._durationLabel.textContent = getHumanTime(duration);
	};
	
	this.getCurrentTime = function() {
		return this._progress * this.duration;
	}
	
	this.setCurrentTime = function(currentTime) {
		this.currentTime = currentTime;
		this._progress.style.width =
			((this.currentTime / this.duration) * 100) + '%';
		this._currentTimeLabel.textContent = getHumanTime(this.currentTime);
	};
}

//======================================================================

// Задержка - в секундах
function IdleListener(timeout) {
	this._timeout = timeout;
	this._subs = new Array();
	this._t = 0;
	
	this._onkeydown = function(event) {
		if (this._t) this.clearTimeout(this._t);
		this._t = this.setTimeout(function() { this._onIdle(); }, this._timeout);
	};
	
	this._onIdle = function() {
		for (var sub of this._subs) sub();
	};
	
	this.attach = function(sub) {
		this._subs.push(sub);
	};
	
	this.init = function() {
		window.addEventListener('keydown', this._onkeydown);
	};
}

//======================================================================


function InfoBar() {
	this.__proto__ = UIElement;
	
	this._root = createUIElementFromHTML('infoBar');
	this._progressBar = new ProgressBar();
	this._progressBar.bind(this._root);
	
	this._seasonNameLabel =
		this._root.getElementsByClassName("season-name")[0];
	
	this._episodeNameLabel =
		this._root.getElementsByClassName("episode-name")[0];
	
	this.getProgressBar = function() {
		return this._progressBar;
	}
	
	this.setSeasonName = function(name) {
		this._seasonNameLabel.textContent = name;
	}
	
	this.setEpisodeName = function(name) {
		this._episodeNameLabel.textContent = name;
	}
}



//======================================================================

function EpisodeItem(episode) {
	this.__proto__ = UIElement;
	
	this._root = createUIElementFromHTML('episodeItem');
	this._previewImage = this._root.getElementsByClassName('episode-preview')[0];
	this._nameLabel = this._root.getElementsByClassName('episode-name')[0];
	
	this.data = episode;
	
	this._previewImage.src = this.data.preview_url ||
		"http://192.168.88.250/static/defaultPreview.png";
	this._nameLabel.textContent = this.data.name;
	
	this.select = function() {
		this._root.classList.add('selected');
	};
	
	this.unselect = function() {
		this._root.classList.remove('selected');
	};
}

function EpisodeMenu() {
	this.__proto__ = UIElement;
	
	this.items = [];
	this._selectPos = 0;
	this._itemsOnScreenCount = 3;
	
	this._root = createUIElementFromHTML('episodeMenu');
	this._itemsPlace = this._root.getElementsByClassName('items-place')[0];
	
	this.setItems = function(episodes) {
		this.items = [];
		for (var episode of episodes) {
			var item = new EpisodeItem(episode);
			this.items.push(item);
		}
		
		this._rebuild();
	};
	
	this.next = function() {
		if (this._selectPos < this.items.length) {
			this.getSelectedItem().unselect();
			this._selectPos++;
			this.getSelectedItem().select();
		}
	};
	
	this.prev = function() {
		if (this._selectPos >= 0) {
			this._selectPos--;
		}
	}
	
	this.getSelectedItem = function() {
		return this.items[this._selectPos];
	}

	this._rebuild = function() {
		this._itemsPlace.textContent = "";
		
		var start = Math.max(0, this._selectPos - this._itemsOnScreenCount/2);
		var end = Math.min(this.items.length, start + this._itemsOnScreenCount);
		start = Math.max(0, end - this._itemsOnScreenCount);
		
		for (i = start; i < end; i++) {
			if (i == this._selectPos) this.items[i].select();
			this.items[i].bind(this._itemsPlace);
		}
	}
}

//======================================================================

function EpisodeList(items) {
	this.items = items;
	this.__proto__ = UIElement;
	
	this._root = createUIElementFromHTML('episodeListMenu');
	
	this._episodeMenu = new EpisodeMenu();
	this._episodeMenu.bind(this._root);
	this._episodeMenu.setItems(Collector.getCurrentSeason().episodes);
}


//======================================================================

function updateInfobar() {
	UI.infoBar.getProgressBar().setDuration(webapis.avplay.getDuration());
	UI.infoBar.setSeasonName(Collector.getCurrentVideo().name);
	UI.infoBar.setEpisodeName(Collector.getCurrentEpisode().name);
}

function avplay_video(src) {
	var player = document.createElement('object');
	player.type = 'application/avplayer';
	player.id = 'avplayer';
	document.body.appendChild(player);
	
	webapis.avplay.setListener({
		"onstreamcompleted": () => {
			webapis.avplay.stop();
			webapis.avplay.close();
			
			Collector.nextEpisode().then(() => {
				webapis.avplay.open(Collector.currentEpisodeURI);
				webapis.avplay.prepare();
				webapis.avplay.play();
				updateInfobar();
			});
		},
		
		"oncurrentplaytime": currentTime => {
			UI.infoBar.getProgressBar().setCurrentTime(currentTime);
		}
	});
	
	return player;
}

const KeyCode = {
	LEFT:  37,
	UP:    38,
	RIGHT: 39,
	DOWN:  40,
	OK:    13,
	BACK:  10009
};

window.addEventListener('keydown', event => {
	if (event.keyCode == KeyCode.BACK) {
		UI.infoBar.show();
	}
	
	if (event.keyCode == KeyCode.UP) {
		UI.episodeList.show();
	}
	
	if (event.keyCode == KeyCode.LEFT) {
		UI.infoBar.show();
		webapis.avplay.jumpBackward(10000);
	}
	
	if (event.keyCode == KeyCode.RIGHT) {
		UI.infoBar.show();
		webapis.avplay.jumpForward(10000);
	}
});





window.addEventListener('portalLoad', () => {
	UI.idleListener = new IdleListener(5000);
	UI.idleListener.init();
	
	UI.idleListener.attach(() => {
		UI.infoBar.hide();
	});
	
	UI.player = avplay_video();
	webapis.avplay.open(Collector.currentEpisodeURI);
	webapis.avplay.prepare();
	webapis.avplay.play();
	
	UI.infoBar = new InfoBar();
	UI.infoBar.bind(document.body);
	updateInfobar();
	
	UI.episodeList = new EpisodeList();
	UI.episodeList.bind(document.body);
});