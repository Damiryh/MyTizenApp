UI = {
	focusedElement: window
};

/* // For remotes
const KeyCode = {
	LEFT:  37,
	UP:    38,
	RIGHT: 39,
	DOWN:  40,
	OK:    13,
	BACK:  10009
};
*/

const KeyCode = {
	LEFT:  37,
	UP:    38,
	RIGHT: 39,
	DOWN:  40,
	OK:    13,
	BACK:  8
};

const UIElement = {
	bindElement: function(owner) {
		this._owner = owner;
		this._owner.appendChild(this._root);

		window.addEventListener("keydown", this._onkeydownHandler.bind(this));
		window.addEventListener("keyup", this._onkeyupHandler.bind(this));
	},
	
	_onkeydownHandler: function(event) {
		if (UI.focusedElement == this._root) {
			this.onkeydown(event);
			event.stopImmediatePropagation();
		}
	},
	
	_onkeyupHandler: function(event) {
		if (UI.focusedElement == this._root) {
			this.onkeyup(event);
			event.stopImmediatePropagation();
		}
	},
	
	unbindElement: function() {
		this._owner.removeChild(this._root);
		this._owner = undefined;
	},
	
	show: function() {
		this._root.classList.remove('hidden');
	},
	
	hide: function() {
		this._root.classList.add('hidden');
	},
	
	focus: function() {
		UI.focusedElement = this._root;
	},
	
	unfocus: function() {
		UI.focusedElement = window;
	},
	
	onkeydown: function(event) {},
	onkeyup: function(event) {}
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
	};
	
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
		if (this._t) clearTimeout(this._t);
		this._t = setTimeout(
			this._onIdle.bind(this),
			this._timeout
		);
	};
	
	this._onIdle = function() {
		for (var sub of this._subs) sub();
	};
	
	this.attach = function(sub) {
		this._subs.push(sub);
	};
	
	window.addEventListener('keypress', this._onkeydown.bind(this));
}

//======================================================================


function InfoBar() {
	this.__proto__ = UIElement;
	
	this._root = createUIElementFromHTML('infoBar');
	this._progressBar = new ProgressBar();
	this._progressBar.bindElement(this._root);
	
	this._seasonNameLabel =
		this._root.getElementsByClassName("season-name")[0];
	
	this._episodeNameLabel =
		this._root.getElementsByClassName("episode-name")[0];
	
	this.getProgressBar = function() {
		return this._progressBar;
	};
	
	this.setSeasonName = function(name) {
		this._seasonNameLabel.textContent = name;
	};
	
	this.setEpisodeName = function(name) {
		this._episodeNameLabel.textContent = name;
	};
}

//======================================================================

const Item = {
	__proto__: UIElement,
	
	select: function() {
		this._root.classList.add('selected');
	},
	
	unselect: function() {
		this._root.classList.remove('selected');
	}
};

const Menu = {
	__proto__: UIElement,
	_selectPos: 0,
	_items: [],
	_itemsOnScreenCount: 3,

	setItems: function(items) {
		this._items = items;
		this._selectPos = 0;

		for (i = 0; i < this._items.length; i++) {
			this._items[i]._root.style.width = (100/this._itemsOnScreenCount) + "%";
			if (i == this._selectPos) {
				this._items[i].select();
			}
		}

		this._firstItemPos = 0;
		this._lastItemPos = Math.min(
			this._items.length - 1,
			this._itemsOnScreenCount - 1,
		);

		for (i = this._firstItemPos; i <= this._lastItemPos; i++) {
			console.log(i);
			this._items[i].bindElement(this._itemsPlace);
		}
	},

	_shiftMenuLeft: function() {
		if (this._firstItemPos > 0) {
			this._itemsPlace.removeChild(this._items[this._lastItemPos]._root);
			this._lastItemPos -= 1;
			this._firstItemPos -= 1;
			this._itemsPlace.insertBefore(
				this._items[this._firstItemPos]._root,
				this._itemsPlace.firstChild
			);
		}
	},

	_shiftMenuRight: function() {
		if (this._lastItemPos < (this._items.length - 1)) {
			this._itemsPlace.removeChild(this._items[this._firstItemPos]._root);
			this._lastItemPos += 1;
			this._firstItemPos += 1;
			this._itemsPlace.appendChild(this._items[this._lastItemPos]._root);
		}
	},

	prev: function() {
		if (this._selectPos > 0) {
			this.getSelectedItem().unselect();
			this._selectPos -= 1;
			this.getSelectedItem().select();
			if (this._selectPos < Math.floor(this._items.length - this._itemsOnScreenCount/2)) this._shiftMenuLeft();
			console.log(this._selectPos + " " + this._items.length  + " " + this._itemsOnScreenCount/2);
		}
	},

	next: function() {
		if (this._selectPos < (this._items.length - 1)) {
			this.getSelectedItem().unselect();
			this._selectPos += 1;
			this.getSelectedItem().select();
			if (this._selectPos > this._itemsOnScreenCount/2) this._shiftMenuRight();
		}
	},

	getSelectedItem: function() {
		return this._items[this._selectPos];
	}
};


//======================================================================

function SeasonItem(season) {
	this.__proto__ = Item;
	
	this._root = createUIElementFromHTML('seasonItem');
	this._nameLabel = this._root;

	this._nameLabel.textContent = season.name;
}

function SeasonMenu() {
	this.__proto__ = Menu;
	this._items = [];
	
	this._root = createUIElementFromHTML('seasonMenu');
	this._itemsPlace = this._root.getElementsByClassName('items-place')[0];
	
	this.setItems = function(seasons) {
		var items = seasons.map(season => new SeasonItem(season));
		this.__proto__.setItems.call(this, items);
	};
}

//======================================================================

function EpisodeItem(episode) {
	this.__proto__ = Item;
	
	this._root = createUIElementFromHTML('episodeItem');
	this._previewImage = this._root.getElementsByClassName('episode-preview')[0];
	this._nameLabel = this._root.getElementsByClassName('episode-name')[0];
	this.data = episode;
	
	this._previewImage.src = this.data.preview_url || "http://192.168.88.250/static/defaultPreview.png";
	this._nameLabel.textContent = this.data.name;
}

function EpisodeMenu() {
	this.__proto__ = Menu;

	this._root = createUIElementFromHTML('episodeMenu');
	this._itemsPlace = this._root.getElementsByClassName('items-place')[0];
	
	this.setItems = function(episodes) {
		var items = episodes.map(episode => new EpisodeItem(episode));
		this.__proto__.setItems.call(this, items);
	};
}

//======================================================================

function EpisodeList() {
	this.__proto__ = UIElement;
	
	this._root = createUIElementFromHTML('episodeListMenu');
	
	this._seasonMenu = new SeasonMenu();
	this._seasonMenu.bindElement(this._root);
	this._seasonMenu.setItems(Collector.getCurrentVideo().seasons);
	
	this._episodeMenu = new EpisodeMenu();
	this._episodeMenu.bindElement(this._root);
	this._episodeMenu.setItems(Collector.getCurrentSeason().episodes);
}

//======================================================================

function updateInfobar() {
	UI.infoBar.getProgressBar().setDuration(UI.player._duration);
	UI.infoBar.setSeasonName(Collector.getCurrentVideo().name);
	UI.infoBar.setEpisodeName(Collector.getCurrentEpisode().name);
}

//======================================================================

function HTML5Player() {
	this.__proto__ = UIElement;

	this._root = document.createElement('video');
	this._root.id = 'avplayer';
	
	this._source = document.createElement('source');
	this._root.appendChild(this._source);

	this._duration = 0;
	this._currentTime = 0;
	this._currentMedia = "";

	this.oncurrenttimechange = function(currentTime) {};
	this.ondurationchange = function() {};

	this._ontimeupdate = function(event) {
		this._currentTime = this._root.currentTime * 1000;
		this.oncurrenttimechange(this._currentTime);
	};
	this._root.addEventListener('timechange', this._ontimeupdate.bind(this));
	this._root.addEventListener('durationchange', () => {
		this._duration = this._root.duration * 1000;
		this.ondurationchange();
	});

	this.open = function(uri) {
		if (uri != this._currentMedia) {
			this._source.setAttribute('src', uri);
			this._source.setAttribute('type', 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
			this._currentMedia = uri;
		}
	};

	this.close = function() {
		this._root.removeChild(this._source);
	};

	this.stop = function() {
		this._root.pause();
		this._playing = false;
	}

	this.play = function() {
		this._root.play();
		this._playing = true;
	}

	this.pause = function() {
		this._root.pause();
		this._playing = false;
	}

	this.toggle = function() {
		if (this._playing) {
			this.pause();
		}
		else {
			this.play();
		}
	}

	this.jumpForward = function(dt) {
		if ((this._currentTime + dt) < this._duration) {
			this._currentTime += dt;
		}
		else {
			this._currentTime = this._duration;
		}
		
		this.oncurrenttimechange(this._currentTime);
	};
	
	this.jumpBackward = function(dt) {
		if ((this._currentTime - dt) >= 0) {
			this._currentTime -= dt;
		}
		else {
			this._currentTime = 0;
		}
		
		this.oncurrenttimechange(this._currentTime);
	}
	
	this.applyCurrentTime = function() {
		this._root.currentTime = this._currentTime/1000;
	};
}

/*
function AVPlayer() {
	this.__proto__ = UIElement;
	
	try {
		this.avplay = webapis.avplay;
		this._root = document.createElement('object');
		this._root.type = 'application/player';
		this._root.id = 'player';
		
		this._playing = false;
		this._currentTime = 0;
		this._currentMedia = "";
		
		this.oncurrenttimechange = function(currentTime) {};
		this.onstreamcompleted = function() {};
		this.ondurationchange = function() {};
		
		this._listener = {
			oncurrentplaytime: currentTime => {
				this._currentTime = currentTime;
				this.oncurrenttimechange(this._currentTime);
			},
			
			onstreamcompleted: () => {
				this.onstreamcompleted();
			},
		};
		
		this.avplay.setListener(this._listener);
		
		this.open = function(uri) {
			if (uri != this._currentMedia) {
				this.avplay.stop();
				this.avplay.close();
				this.avplay.open(uri);
				this.avplay.prepare();
				this._duration = this.avplay.getDuration();
				this._currentMedia = uri;

				this.ondurationchange();
			}
		};
		
		this.play = function() {
			this.avplay.play();
			this._playing = true;
		};
		
		this.pause = function(uri) {
			this.avplay.pause();
			this._playing = false;
		};
		
		this.stop = function(uri) {
			this.avplay.stop();
			this._playing = false;
			this.avplay.prepare();
		};
		
		this.toggle = function() {
			if (this._playing) {
				this.pause();
			}
			else {
				this.play();
			}
		}
		
		this.jumpForward = function(dt) {
			if ((this._currentTime + dt) < this._duration) {
				this._currentTime += dt;
			}
			else {
				this._currentTime = this._duration;
			}
			
			this.oncurrenttimechange(this._currentTime);
		};
		
		this.jumpBackward = function(dt) {
			if ((this._currentTime - dt) >= 0) {
				this._currentTime -= dt;
			}
			else {
				this._currentTime = 0;
			}
			
			this.oncurrenttimechange(this._currentTime);
		}
		
		this.applyCurrentTime = function() {
			//this._root = this._currentTime;
		};
	}
	catch (error) {
		return new HTML5Player();
	}
}
*/

//======================================================================

window.addEventListener('portalLoad', () => {
	UI.player = new HTML5Player();
	UI.player.bindElement(document.body);
	UI.player.open(Collector.currentEpisodeURI);
	UI.player.play();
	
	UI.player.onkeydown = function(event) {
		if (event.keyCode == KeyCode.LEFT) {
			
		}
		
		if (event.keyCode == KeyCode.UP) {
			this.unfocus();
			UI.infoBar.hide();
		}
		
		else if (event.keyCode == KeyCode.LEFT) {
			this.pause();
			this.jumpBackward(5000);
			
			if (this._moving) clearTimeout(this._moving);
			this._moving = setTimeout((()=>{
				this.jumpBackward(5000);
			}).bind(this), 500);
		}
		
		else if (event.keyCode == KeyCode.RIGHT) {
			this.pause();
			this.jumpForward(5000);
			
			if (this._moving) clearTimeout(this._moving);
			this._moving = setTimeout((()=>{
				this.jumpForward(5000);
			}).bind(this), 500);
		}
		else if (event.keyCode == KeyCode.OK) {
			this.toggle();
		}
	};
	
	UI.player.onkeyup = function(event) {
		if (event.keyCode == KeyCode.LEFT) {
			if (this._moving) clearTimeout(this._moving);
			this._moving = undefined;
			this.applyCurrentTime();
		}
		
		else if (event.keyCode == KeyCode.RIGHT) {
			if (this._moving) clearTimeout(this._moving);
			this._moving = undefined;
			this.applyCurrentTime();
		}
	};
	
	UI.player.ondurationchange = function() {
		UI.infoBar.getProgressBar().setDuration(UI.player._duration);
	}

	UI.player.oncurrenttimechange = function(currentTime) {
		UI.infoBar.getProgressBar().setCurrentTime(currentTime);
	}
	
	UI.infoBar = new InfoBar();
	UI.infoBar.bindElement(document.body);
	updateInfobar();
	
	UI.episodeList = new EpisodeList();
	UI.episodeList.bindElement(document.body);

	UI.episodeList.onkeydown = function(event) {
		if (event.keyCode == KeyCode.LEFT) this._episodeMenu.prev();
		else if (event.keyCode == KeyCode.RIGHT) this._episodeMenu.next();
		else if (event.keyCode == KeyCode.OK) {
			Collector.setCurrentEpisode(this._episodeMenu._selectPos);
			Collector.loadCurrentURI().then(() => {
				UI.player.open(Collector.currentEpisodeURI);
				UI.infoBar.setEpisodeName(Collector.getCurrentEpisode().name);
				UI.infoBar.setSeasonName(Collector.getCurrentVideo().name);
				UI.player.play();
			});
		}
		else if (event.keyCode == KeyCode.DOWN) {
			this.unfocus();
			this.hide();
		}
	};
	
	UI.idleListener = new IdleListener(5000);
	UI.idleListener.attach(function() {
		//UI.infoBar.hide();
	});
	
	window.addEventListener('keydown', event => {
		if (UI.focusedElement == window) {
			if (event.keyCode == KeyCode.DOWN) {
				UI.infoBar.show();
				UI.player.focus();
			}
			
			else if (event.keyCode == KeyCode.UP) {
				UI.episodeList.show();
				UI.episodeList.focus();
			}
			
			else if (event.keyCode == KeyCode.LEFT) {
				UI.infoBar.show();
				UI.player.focus();
				UI.player.onkeydown(event);
			}
			
			else if (event.keyCode == KeyCode.RIGHT) {
				UI.infoBar.show();
				UI.player.focus();
				UI.player.onkeydown(event);
			}
			else if (event.keyCode == KeyCode.OK) {
				UI.infoBar.show();
				UI.player.focus();
				UI.player.onkeydown(event);
			}
			
			event.stopImmediatePropagation();
		}
	});
});