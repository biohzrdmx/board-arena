;(function(window){ "use strict";

	window.Class = function(){};

	var initializing = false;
	var lastClassId = 0;
	var fnTest = /xyz/.test(function(){xyz;}) ? /\bparent\b/ : /.*/;

	var copy = function( object ) {
		if(
			!object || typeof(object) != 'object' ||
			object instanceof HTMLElement ||
			object instanceof Class
		) {
			return object;
		}
		else if( object instanceof Array ) {
			var c = [];
			for( var i = 0, l = object.length; i < l; i++) {
				c[i] = copy(object[i]);
			}
			return c;
		}
		else {
			var c = {};
			for( var i in object ) {
				c[i] = copy(object[i]);
			}
			return c;
		}
	};

	var inject = function(prop) {
		var proto = this.prototype;
		var parent = {};
		for( var name in prop ) {
			if(
				typeof(prop[name]) == "function" &&
				typeof(proto[name]) == "function" &&
				fnTest.test(prop[name])
			) {
				parent[name] = proto[name]; // save original function
				proto[name] = (function(name, fn){
					return function() {
						var tmp = this.parent;
						this.parent = parent[name];
						var ret = fn.apply(this, arguments);
						this.parent = tmp;
						return ret;
					};
				})( name, prop[name] );
			}
			else {
				proto[name] = prop[name];
			}
		}
	};

	var merge = function(original, extended) {
		var extended = extended || {};
		for( var key in extended ) {
			var ext = extended[key];
			if(
				typeof(ext) != 'object' ||
				ext instanceof HTMLElement ||
				ext instanceof Class ||
				ext === null
			) {
				original[key] = ext;
			}
			else {
				if( !original[key] || typeof(original[key]) != 'object' ) {
					original[key] = (ext instanceof Array) ? [] : {};
				}
				merge( original[key], ext );
			}
		}
		return original;
	};

	window.Class.extend = function(prop) {
		var parent = this.prototype;

		initializing = true;
		var prototype = new this();
		initializing = false;

		for( var name in prop ) {
			if(
				typeof(prop[name]) == "function" &&
				typeof(parent[name]) == "function" &&
				fnTest.test(prop[name])
			) {
				prototype[name] = (function(name, fn){
					return function() {
						var tmp = this.parent;
						this.parent = parent[name];
						var ret = fn.apply(this, arguments);
						this.parent = tmp;
						return ret;
					};
				})( name, prop[name] );
			}
			else {
				prototype[name] = prop[name];
			}
		}

		function Class() {
			if( !initializing ) {

				// If this class has a staticInstantiate method, invoke it
				// and check if we got something back. If not, the normal
				// constructor (init) is called.
				if( this.staticInstantiate ) {
					var obj = this.staticInstantiate.apply(this, arguments);
					if( obj ) {
						return obj;
					}
				}
				for( var p in this ) {
					if( typeof(this[p]) == 'object' ) {
						this[p] = copy(this[p]); // deep copy!
					}
				}
				this.merge = merge;
				if( this.init ) {
					this.init.apply(this, arguments);
				}
			}
			return this;
		}

		Class.prototype = prototype;
		Class.prototype.constructor = Class;
		Class.extend = window.Class.extend;
		Class.inject = inject;
		Class.classId = prototype.classId = ++lastClassId;

		return Class;
	};

})(window);