 /**
  * a micro spa router lib based on jquery
  * 本库遵循约定大于配置, hash部分完整格式如下:
  * #!/controllerName/actionName~paramName1=paramValue1&paramName2=paramValue2
  * 值得注意的是: controllerName和actionName前的'/'不可或缺, 缺省的controllerName和actionName皆为'_'
  * 本库不支持IE7及以下版本, 若需要支持请参考<a href="https://github.com/iamweilee/bird/blob/master/src/lib/bird/mvvm/bird.router.ie7support.js">bird.router.ie7support.js</a>自行实现
  * @author DavidLee
  */
 (function(name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = definition();
  }
  else if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(definition);
  }
  else {
    context[name] = definition();
  }
 })('jr',this,function(args) {

  var nextTick = window.setImmediate ? setImmediate.bind(window) : function(callback) {
    setTimeout(callback, 0);
  };
  
  function jqrouter() {
    this.location = null;
    this.hash = null;
    this.controllerName = null;
    this.actionName = null;
    this.query = null;
    this.param = null;
    this.controllerMap = null;

    this.init();
  }

  var proto = jqrouter.prototype;

  proto.init = function() {
    var me = this;

    var hashChangeHandle = function() {
      me.handleHashChange();
    };
    $(window).on('hashchange', hashChangeHandle);
    this.offHashChange = function() {
      $(window).off('hashchange', hashChangeHandle);
    };

    this.bootFirstUrl();
  };

  proto.handleHashChange = function() {
    this.location = location.href;
    this.hash = this.getHash();
    this.controllerName = this.parseControllerName(this.hash);
    this.actionName = this.parseActionName(this.hash);
    this.query = this.parseQuery(this.hash);
    this.param = this.parseParams(this.query);
    this.execute();
  };

  proto.getHash = function() {
    var hash = location.hash;
    if (hash) {
      // URL不区分大小写
      return (hash.replace(/^(?:#!|#)/, '') || '/').toLowerCase();
    }
    return '/';
  };

  proto.parseControllerName = function(hash) {
    var arr = /^\/([a-z_][a-z0-9_]*)/i.exec(hash || this.hash);
    var controllerName = '_';
    if (arr && arr[1]) {
      controllerName = arr[1];
    }
    return controllerName;
  };

  proto.parseActionName = function(hash) {
    var arr = /^\/[a-z_][a-z0-9_]*\/([a-z_][a-z0-9_]*)/i.exec(hash || this.hash);
    var actionName = '_';
    if (arr && arr[1]) {
      actionName = arr[1];
    }
    return actionName;
  };

  proto.parseQuery = function(hash) {
    var arr = (hash || this.hash).split('~');
    var query = '';
    if (arr && arr[1]) {
      query = decodeURIComponent(arr[1]);
    }
    return query;
  };

  proto.parseParams = function(query) {
    query = query || this.query;
    var param = {};
    if (!query) {
      return param;
    }
    
    query.replace(/([^#~=&]+)=([^#~=&]*)/g, function(m, n, k) {
        param[n] = k;
    });
    return param;
  };

  proto.execute = function(controllerName, actionName) {
    if (!this.controllerMap) {
      return;
    }
    controllerName = controllerName || this.controllerName;
    actionName = actionName || this.actionName;
    var controller = this.controllerMap[controllerName];
    if (!controller) {
      console.error('[Controller: ' + controllerName + '] not register!');
      return;
    }
    var action = controller[actionName];
    if (!action) {
      console.error('[Controller.Action: ' + controllerName + '.' + actionName + '] not register!');
      return;
    }
    action.call(controller, this);
  };

  /**
   * 注册Controller, Controller的格式如下:
   * {
   *    controllerName1: {
   *      actionName1: function() {...},
   *      actionName2: function() {...},
   *      ...
   *    },
   *    controllerName2: {
   *      actionName1: function() {...},
   *      actionName2: function() {...},
   *      ...
   *    },
   *    ...
   * }
   */
  proto.register = function(controllerName, controller) {
    this.controllerMap = this.controllerMap || {};
    var controllerMap, controllerCopy, i, j;
    if (arguments.length === 2) {
      controllerCopy = {};
      for (j in controller) {
        controllerCopy[j.toLowerCase()] = controller[j];
      }
      this.controllerMap[controllerName] = controllerCopy;
    }
    else {
      controllerMap = controllerName;
      for (i in controllerMap) {
        controllerName = i.toLowerCase();
        controller = controllerMap[i];
        controllerCopy = {};
        for (j in controller) {
          controllerCopy[j.toLowerCase()] = controller[j];
        }
        this.controllerMap[controllerName] = controllerCopy;
      }
    }
    return this;
  };

  proto.clear = function() {
    this.location = null;
    this.hash = null;
    this.controllerName = null;
    this.actionName = null;
    this.query = null;
    this.param = null;
    this.controllerMap = null;
  };

  proto.destroy = function() {
    this.clear();
    this.offHashChange();
  };

  proto.bootFirstUrl = function() {
    var me = this;
    nextTick(function() {
      me.handleHashChange();
    });
  };

  return new jqrouter;
});