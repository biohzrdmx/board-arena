App = Class.extend({
	defaultRoute: '/start',
	templates: {},
	containers: {},
	routes: [],
	boards: {},
	metaTags: {},
	init: function(options) {
		var obj = this,
			opts = _.defaults(options, {
				// Add options here
			});
		jQuery(document).ready(function($) {
			obj.onDomReady($);
		});
	},
	onDomReady: function($) {
		var obj = this;
		//
		obj.containers.header = $('.app-header');
		obj.containers.footer = $('.app-footer');
		obj.containers.client = $('.app-client');
		//
		obj.templates._header = obj.compileTemplate('#partial-header');
		obj.templates._footer = obj.compileTemplate('#partial-footer');
		obj.templates.pageError = obj.compileTemplate('#page-error');
		obj.templates.pageStart = obj.compileTemplate('#page-start');
		obj.templates.pageBoard = obj.compileTemplate('#page-board');
		//
		obj.addRoute('error', '/error', function(params) {
			obj.renderTemplate(obj.containers.client, 'pageError', params);
			return true;
		});
		obj.addRoute('start', '/start', function(params) {
			obj.renderTemplate(obj.containers.client, 'pageStart', params);
			//
			$('[name=search]').on('keyup', function(e) {
				var el = $(this),
					val = el.val();
				if ( val.length ) {
					$('.list-boards .item').parent().addClass('d-none')
					$('.list-boards .item').filter('[data-name*="'+ val +'"]').parent().removeClass('d-none');
				} else {
					$('.list-boards .item').parent().removeClass('d-none');
				}
			}).closest('form').on('submit', function() {
				return false;
			});
			//
			$('html, body').scrollTop(0);
			//
			app.metaTags["og:title"].restore();
			app.metaTags["og:image"].restore();
			app.metaTags["og:description"].restore();
			app.metaTags["og:url"].restore();
			//
			document.title = app.metaTags["og:title"].getContent();
			//
			return true;
		});
		obj.addRoute('board', '/board/:slug', function(params) {
			obj.loadData({
				src: 'assets/boards/'+ params[1] +'/board.json',
				progress: function(percent) {
					//
				},
				success: function(data) {
					data.slug = params[1];
					obj.renderTemplate(obj.containers.client, 'pageBoard', { board: data });
					//
					$('html, body').scrollTop(0);
					console.log(data);
					//
					app.metaTags["og:title"].setContent(data.name);
					app.metaTags["og:image"].setContent(app.metaTags["og:url"].getOriginal() + 'assets/boards/' + data.slug + '/board.svg');
					app.metaTags["og:description"].setContent(data.tagline);
					app.metaTags["og:url"].setContent(app.metaTags["og:url"].getOriginal() + '#/board/' + data.slug);
					//
					document.title = app.metaTags["og:title"].getContent();
				}
			});
			return true;
		});
		//
		$(window).on('hashchange', function() {
			if ( location.hash.length ) {
				var route = location.hash.replace(/^#?\/?(.*)$/ig, '$1').replace(/^\/+|\/+$/g, ''),
					handled = false;
				for (var i = 0; i < obj.routes.length; i++) {
					var params = obj.routes[i].expr.exec('/'+ route);
					if (params) {
						handled = obj.routes[i].handler(params);
					}
				}
				if (!handled) {
					obj.navigateTo('/error');
				}
			} else {
				obj.navigateTo(obj.defaultRoute);
			}
		});
		//
		obj.loadData({
			src: 'assets/boards/index.json',
			progress: function(percent) {
				//
			},
			success: function(data) {
				obj.boards = data;
				//
				obj.renderTemplate(obj.containers.header, '_header');
				obj.renderTemplate(obj.containers.footer, '_footer', { date: new Date });
				//
				$(window).trigger('hashchange');
			}
		});
		//
		$('meta[property^="og:"]').each(function() {
			var meta = $(this);
			obj.metaTags[ meta.attr('property') ] = {
				el: meta,
				original: meta.attr('content'),
				setContent: function(content) {
					meta.attr('content', content);
				},
				getContent: function() {
					return meta.attr('content');
				},
				getOriginal: function() {
					return this.original;
				},
				restore: function() {
					meta.attr('content', this.original);
				}
			};
		});
	},
	loadData: function(options) {
		var obj = this,
			opts = _.defaults(options, {
				src: '',
				progress: $.noop,
				success: $.noop,
				error: $.noop,
				complete: $.noop
			});
		$.ajax({
			url: opts.src,
			type: 'get',
			dataType: 'json',
			xhr: function() {
				var xhr = new window.XMLHttpRequest();
				xhr.addEventListener("progress", function(evt){
					if (evt.lengthComputable) {
						var percent = (evt.loaded / evt.total) * 100;
						opts.progress(percent);
					}
				}, false);
				return xhr;
			}
		}).done(function(data) {
			opts.success(data);
		}).fail(function() {
			opts.error();
		}).always(function() {
			opts.complete();
		});
	},
	compileTemplate: function(selector) {
		return _.template( $(selector).html() || '<div>Template not found at "' + selector + '"</div>' );
	},
	addRoute: function(name, route, handler) {
		var obj = this;
		route = route.replace(/[\-{}\[\]+?.,\\\^$|#\s]/g, '\\$&')
			.replace(/\((.*?)\)/g, '(?:$1)?')
			.replace(/(\(\?)?:\w+/g, function(match, optional) {
				return optional ? match : '([^/?]+)';
			})
			.replace(/\*\w+/g, '([^?]*?)');
		route = new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
		obj.routes.unshift({
			name: name,
			expr: route,
			handler: handler
		});
	},
	renderTemplate: function(target, template) {
		var obj = this,
			fn = obj.templates[template] || null;
		if (!! fn) {
			var args = arguments[2] || {}
			target.html( fn(args) );
		}
	},
	navigateTo: function(route) {
		location.hash = '#' + route;
	},
	formatBytes: function(bytes) {
		var ret = bytes === false ? '--' : '0 Byte';
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		if (bytes > 0) {
			var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
			ret = Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
		}
		return ret;
	},
	formatArray: function(array, unit, separator, multiplier) {
		var ret = '';
		var multiplier = multiplier || 1;
		if ( Array.isArray(array) ) {
			for (var i = 0; i < array.length; i++) {
				ret += i < array.length - 1 ? '' : ' ' + separator + ' ';
				ret += (array[i] * multiplier) + unit;
			}
		} else {
			ret = array === false ? '--' : (array * multiplier) + unit;
		}
		return ret;
	}
});

var app = new App();