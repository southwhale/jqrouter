 /**
  * a micro mvvm lib based on jquery
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
 })('jm',this,function(args) {
    // 观察者模式
    function Observer() {
        this.channelMap = {};
    }
    (function() {
        //外部订阅/发布对象缓存区
        this.subscribe = function(channel, update) {
            if ($.isFunction(update)) {
                this.channelMap[channel] = this.channelMap[channel] || [];
                this.channelMap[channel].push(update);
            }
        };
        this.unsubscribe = function(channel, update) {
            if (arguments.length === 1) {
                this.channelMap[channel].length = 0;
                delete this.channelMap[channel];
                return;
            }
            if (!arguments.length) {
                var me = this;
                $.each(this.channelMap, function(channel, updates) {
                    updates.length = 0;
                    delete me.channelMap[channel];
                });
                return;
            }
            var fnArray = this.channelMap[channel];
            if (!fnArray) {
                return;
            }
            $.each(fnArray, function(index, fnArray, fn) {
                if (fn === update) {
                    fnArray.splice(index, 1);
                }
            });
            if (!fnArray.length) {
                delete this.channelMap[channel];
            }
        };
        this.publish = function(channel) {
            var args = Array.prototype.slice.call(arguments, 1);
            var me = this;
            $.each(this.channelMap[channel] || [], function(index, update) {
                update.apply(me, args);
            });
            args = me = null;
        };
        this.watch = this.subscribe;
        this.unwatch = this.unsubscribe;
        this.notify = this.publish;
    }).call(Observer.prototype);
    


    // 生成uuid的字符集
    var CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    var jmAttrRE = /^jm-([a-z]+)$/i;
    var inputTagMap = {
      input: 1,
      textarea: 1,
      select: 1
    };

    var excludeInputTypeMap = {
      hidden: 1
    };

    var inputEventTypeMap = {
      checkbox: 'click',
      date: 'input',
      datetime: 'input',
      'datetime-local': 'input',
      email: 'input',
      file: 'change',
      month: 'input',
      number: 'input',
      password: 'input',
      radio: 'click',
      range: 'change',
      text: 'input',
      time: 'input',
      url: 'input',
      week: 'input'
    };


    var specialHandlerMap = {
      html: function(element, newValue, oldValue) {
        $(element).html(newValue);
      },
      text: function(element, newValue, oldValue) {
        $(element).text(newValue);
      },
      value: function(element, newValue, oldValue) {
        $(element).val(newValue);
      },
      'class': function(element, newValue, oldValue) {
        var $element = $(element);
        if (oldValue) {
          $element.removeClass(oldValue);
        }
        $element.addClass(newValue);
      }
    };

    var eventNames = [ "click", "dblclick", "mouseover", "mouseout", "mousemove", "mouseenter", "mouseleave", "mouseup", "mousedown", "mousewheel", "keypress", "keydown", "keyup", "load", "unload", "beforeunload", "abort", "error", "move", "resize", "scroll", "stop", "hashchange", "blur", "change", "focus", "reset", "submit", //form
      "start", "finish", "bounce", //marquee
      "contextmenu", //右键
      "drag", "dragdrop", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "propertychange", "readystatechange", "input", "popstate", "beforeprint", "afterprint", "help", //F1键
      "select", "selectstart", "copy", "cut", "paste", "losecapture", "beforecopy", "beforecut", "beforeeditfocus", "beforepaste", "beforeupdate", "touchstart", "touchmove", "touchend" ];

    for (var i = 0; i < eventNames.length; i++) {
      specialHandlerMap[eventNames[i]] = (function(i) {
        return function(element, newValue, oldValue) {
          if (!$.isFunction(newValue)) {
            return;
          }
          var $element = $(element);
          if ($.isFunction(oldValue)) {
            $element.off(eventNames[i], oldValue);
          }
          $element.on(eventNames[i], newValue);
        };
      })(i);
    }

    function defaultHandler(element, attrName, attrValue) {
      $(element).attr(attrName, attrValue);
    }

    function jqmvvm() {
      return new jqmvvm.fn;
    }

    jqmvvm.fn = function() {
      this.rootModel = {};
      this.relationMap = {};
      this.watcher = new Observer();
    };
    
    var proto = jqmvvm.fn.prototype;

    /**
     * 扫描root元素下所有子元素，过滤出有双向绑定的元素
     * @param {HtmlElement} root 被扫描的根元素
     */
    proto.scan = function(root) {
      if (typeof root === 'string') {
        root = document.getElementById(root);
      }
      var me = this;
      walkDomTree(root, function(element) {
        var attrs = element.attributes;
        var relation = me.relationMap[element.id];
        for (var i = 0; i < attrs.length; i++) {
          var attr = attrs[i];
          // nodeType:2 ——> Attribute Node
          if (attr.nodeType === 2 && jmAttrRE.test(attr.nodeName)) {
            relation = relation || {};
            var rawAttrName = jmAttrRE.exec(attr.nodeName)[1];
            var modelExpression = attr.nodeValue;
            relation[attr.nodeName] = {
              rawAttrName: rawAttrName,
              modelExpression: modelExpression
            };

            if (!element.id) {
              element.id = 'jmnode_' + uuid(8, 16);
            }

            me.watcher.watch(modelExpression, (function(rawAttrName, element) {
              return function(d) {
                if (specialHandlerMap[rawAttrName]) {
                  specialHandlerMap[rawAttrName](element || document.getElementById(element.id), d);
                }
                else {
                  defaultHandler(element || document.getElementById(element.id), rawAttrName, d);
                }
              }
            })(rawAttrName, element));
          }
        }
        if (relation) {
          var tagName = element.tagName.toLowerCase();
          if (inputTagMap[tagName]) {
            var eventType;
            if (tagName === 'input' && !excludeInputTypeMap[element.type]) {
              eventType = inputEventTypeMap[element.type];
            }
            else if (tagName === 'textarea') {
              eventType = 'input';
            }
            else if (tagName === 'select') {
              eventType = 'change';
            }

            if (relation['jm-value']) {
              $(element).on(eventType, function() {
                me.setModelValue(relation['jm-value']['modelExpression'], $(element).val());
              });
            }
          }
          me.relationMap[element.id] = relation;
        }
      });
      return this;
    };


    /**
     * 根据model表达式获取相应的值
     * @param {string} modelExpression model表达式
     * @return {string|number} model值
     */
    proto.getModelValue = function(modelExpression) {
      var modelValue = this.rootModel;
      var modelFields = modelExpression.split('.');
      for (var i = 0; i < modelFields.length; i++) {
        var field = modelFields[i];

        if (i !== modelFields.length - 1 && typeof modelValue[field] === 'undefined') {
          modelValue[field] = {};
        }
        modelValue = modelValue[field];
      }
      return modelValue;
    };

    /**
     * 设置model表达式对应的model值，如果新值与旧值相等则忽略
     * @param {string} modelExpression model表达式
     * @param {string|number} newValue 新值
     */
    proto.setModelValue = function(modelExpression, newValue) {
      var oldValue = this.getModelValue(modelExpression);
      if (oldValue !== newValue) {
        var modelValue = this.rootModel;
        var modelFields = modelExpression.split('.');
        for (var i = 0; i < modelFields.length - 1; i++) {
          var field = modelFields[i];

          if (typeof modelValue[field] === 'undefined') {
            modelValue[field] = {};
          }
          modelValue = modelValue[field];
        }
        this.watcher.notify(modelExpression, newValue);
        modelValue[modelFields[modelFields.length - 1]] = newValue;
      }
      return this;
    };

    proto.set = proto.setModelValue;
    proto.get = proto.getModelValue;

    proto.clear = function() {
      this.rootModel = {};
      this.relationMap = {};
      this.watcher = new Observer();
    };

    proto.destroy = function() {
      this.rootModel = null;
      this.relationMap = null;
      this.watcher = null;
    };

    // 使jqmvvm拥有jqmvvm.fn的行为
    var instance = jqmvvm();
    for (var j in proto) {
      if (proto.hasOwnProperty(j)) {
        var property = proto[j];
        if ($.isFunction(property)) {
          jqmvvm[j] = (function(fn) {
            return function() {
              return fn.apply(instance, arguments);
            };
          })(property);
        }
      }
    }
  
    return jqmvvm;


    /**
     * 遍历root元素及其子孙元素，并对每个被遍历的元素执行handler
     * @param {HtmlElement} 根元素
     * @param {function} 处理函数
     */
    function walkDomTree(root, handler) {
      handler(root);
      var children = root.children;
      if (!children.length) {
        return;
      }

      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        walkDomTree(child, handler);
      }
    }

    
    /**
     * 生成uuid
     * @param {integer} len 期望uuid的长度
     * @param {integer} radix 进制
     * @return {string} 生成的uuid
     */
    function uuid(len, radix) {
      var chars = CHARS, uuid = [], i;
      radix = radix || chars.length;
      if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
      }
      else {
        // rfc4122, version 4 form
        var r;
        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
        uuid[14] = "4";
        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
          if (!uuid[i]) {
            r = 0 | Math.random() * 16;
            uuid[i] = chars[i == 19 ? r & 3 | 8 : r];
          }
        }
      }
      return uuid.join("");
    }
  
});