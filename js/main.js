const TVMW_API_KEY = "Xeigh2yai6Iuv0jataoyaech3muopaesei9eithah1eichi9OP5ce1hee0hei9Ma";
const TVMW_API_URL = PORTAL_URL + "/tvmiddleware/api";
const CLIENT_ID = 1;

const USER_ACCOUNT = {
	'abonement': '88088',
	'password': '123'
};

Collector = {
	_currentVideoPos: 0,
	_currentSeasonPos: 0,
	_currentEpisodePos: 0,
	
	loadVideos: function() {
		return atvmw('/video/list/', {
			'season': 1,
		})
		.then(response => {
			this._videos = response.videos;
		});
	},
	
	loadVideo: function(video_id) {
		return atvmw('/video/detail/', {
			'vid': video_id,
		})
		.then(response => {
			this._currentVideo = {
				'id': video_id,
				'name': response.name,
				'seasons': []
			};
			
			var episodeListRequests = [];
			
			for (var season of response.seasons) {
				episodeListRequests.push(atvmw('/video/episode/list/', {
					'season_id': season.id
				}));
			};
			
			return Promise.all(episodeListRequests).then(responses => {
				for (var i = 0; i < responses.length; i++) {
					this._currentVideo.seasons.push({
						'id': response.seasons[i].id,
						'name': response.seasons[i].name,
						'number': response.seasons[i].number,
						'episodes': responses[i].episodes
					});
				}
			});
		});
	},
	
	loadURI: function(video_id, episode_asset_id) {
		return atvmw('/video/url/', {
			'vid': video_id,
			'fvid': episode_asset_id,
			//'device': 'android_stb',
			'redirect': 0
		})
		.then(response => {
			this.currentEpisodeURI = response.uri;
		});
	},
	
	loadCurrentURI: function() {
		return this.loadURI(
			Collector.getCurrentVideo().id,
			Collector.getCurrentEpisode().id
		);
	},
	
	getCurrentVideo: function() {
		if (this._currentVideo) {
			return this._currentVideo;
		}
		else {
			return this._videos[this._currentVideoPos];
		}
	},
	
	getCurrentSeason: function() {
		return this._currentVideo.seasons[this._currentSeasonPos];
	},
	
	getCurrentEpisode: function() {
		return this.getCurrentSeason().episodes[this._currentEpisodePos];
	},
	
	setCurrentVideo: function(pos) { this._currentVideoPos = pos; },
	setCurrentSeason: function(pos) { this._currentSeasonPos = pos; },
	setCurrentEpisode: function(pos) { this._currentEpisodePos = pos; },
	
	
	nextEpisode: function() {
		if (this._currentEpisodePos < this.getCurrentSeason().episodes.length) {
			this._currentEpisodePos += 1;
			this.loadCurrentURI();
			return false;
		}
		else {
			return true;
		}
	}
};


function tvmw(path, params) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		var url = new URL(TVMW_API_URL + path);
		params.client_id = CLIENT_ID;
		
		url.search = "?" + Object
			.keys(params)
			.map(key => key + "=" + params[key])
			.join('&');
		
		xhr.open("GET", url);
		xhr.send();
		
		xhr.onload = function() {
			if (xhr.status != 200) reject(xhr.response); else {
				var j = JSON.parse(xhr.response);
				if (j.error != 0) reject(xhr.response); else resolve(j);
			}
		};
	});
}


function auth_tvmw(authkey) {
	return function(path, params) {
		params.authkey = authkey;
		return tvmw(path, params);
	};
}

function init_tvmw_portal() {
	return tvmw('/login/', {
		'abonement': '88088',
		'password': '123',
		'api_key': TVMW_API_KEY
	})
	.then(response => {
		atvmw = auth_tvmw(response.authkey);
		return Collector.loadVideos();
	})
	.then(() => {
		Collector.setCurrentVideo(0);
		return Collector.loadVideo(Collector.getCurrentVideo().id);
		//return Collector.loadVideo(319835);
	})
	.then(() => {
		return Collector.loadCurrentURI();
	});
}
