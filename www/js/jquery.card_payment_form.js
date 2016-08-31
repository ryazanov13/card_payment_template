// Fix for IE9
// if (!window.console) console = {log: function() {}}; // В IE нет класса console
window.console = window.console || {
	log: function() {}
};
// End fix for IE9

Object.keys = Object.keys || function(o) {  
    var result = [];  
    for(var name in o) {  
        if (o.hasOwnProperty(name))  
          result.push(name);  
    }  
    return result;  
};

jQuery.extend({
	postJSON: function( url, data, callback) {
	   return jQuery.post(url, data, callback, "json");
	}
});

/*
 * Форма для ввода данных банковской карты
 * на будущее можно добавить:
 * 1. отдельные обработчики для полей форм(допустим вставка сообщения в поле message в info_form
 * 2. добавление пользовательских форм
 * 3. при ответе reload, возможность отобразить сообщение
 * 4. исключить мерцания при очистки полей от плохих символов
 */
(function( $ ){
//'use strict';

	
	/**
	 * Constants
	 */ 
	PLUGIN_NAME = 'card_payment_form',
	MAXLENGTH_ATTRIBUTE = 'maxlength',
	SMS_CODE_LENGTH = 6,
	
	/*
	 * Таймаут до появления кнопки обновления смс-кода
	 */ 
	SMS_CODE_REFRESH_TIMEOUT = 60,	
	
	LOADER_REFERSH_ACTION_TIMEOUT = 5,
	LOADER_SHOTDOWN_TIMEOUT = 600,
	
	/*
	 * Поля для формы оплаты 
	 */
	ID_CARD_INPUT_FORM = 'card_input_form',
	
	NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD = 'card_num_1',
	NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD = 'card_num_2',
	NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD = 'card_num_3',
	NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD = 'card_num_4',
	NAME_CARD_INPUT_FORM_CARD_NUM_FIELD = 'card_num',
	
	NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD = 'exp_month',
	NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD = 'exp_year',
	NAME_CARD_INPUT_FORM_EXP_DATE_FIELD = 'exp_date',
	
	NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD = 'name_on_card',
	NAME_CARD_INPUT_FORM_CARD_CVC_FIELD = 'card_cvc',
	
	/*
	 * Поля для формы loader
	 */
	ID_LOADER_FORM = 'loader_form',
	ID_LOADER_FORM_INFO_BY_IDLE_TRANSACTION = 'info_by_idle_transaction';
	ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION = 'info_by_hold_transaction';
	
	/*
	 * Поля для формы для проверки по sms
	 */
	ID_CODE_INPUT_FORM = 'code_input_form',
	NAME_CODE_INPUT_FORM_SMS_CODE_FIELD  = 'sms_code',
	
	ID_INFO_FORM = 'info_form',
	NAME_INFO_FORM_MESSAGE_FIELD = 'message',
	
	ID_FORM_FADER = 'form_fader';
	
	/*
	 * Опера не можеть работать со вставкой данных из буфера обмена. Поэтому для
	 * оперы мы немного меняем поведение формы. А это флаг определяющий это 
	 * поведение
	 * @type Boolean
	 */
	var isOpera = !!window.opera;
	
	var 
		request_url = undefined,
		customer = undefined,
		key = undefined,
		tick = {
			'value' : undefined,
			'get' : function () {
				return tick.value;
			},
			'set': function ( value ) {
				tick.value = value;
			}
		},

		default_settings = {
			'form_type' : 'card_form',
			'accepted_card_brands' : [ 'VISA','VISA ELECTRON','MASTERCARD','MAESTRO' ],
			'min_card_number_length' : undefined,
			'max_card_number_length' : undefined,
			'min_card_cvc_length' : undefined,
			'max_card_cvc_length' : undefined,
			'min_name_on_card_length' : undefined,
			'max_name_on_card_length' : undefined,
			
			// Обрпботчики для отображения ошибок
			'ok_setter' : [],
			'error_setter' : [],
			'nothing_setter' : [],
			// Валидаторы для подмены
			'validators' : [],
			// Обработчики привязываемые к полям
			'handlers' : [],
			'repliers' : []
		},
		settings = {},
		fields = {
			'card_num_fields' : undefined,
			'card_num_field_lengths' : [],
			'card_num_fields_total_lengths' : undefined,
			'card_num' : undefined,
			'exp_date_fields' : undefined,
			'exp_date_field_lengths' : [],
			'exp_date_fields_total_lengths' : undefined,
			'exp_date' : undefined,
			'exp_date_type' : undefined,
			'name_on_card' : undefined,
			'card_cvc' : undefined,
			'sms_code' : undefined,
		};
	
	var 
		ok_setter = {	
			form : function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('from: status ok');
				data['info_form'].removeClass("field-error").addClass("field-ok");
				fields.message.text('');
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num_fields: status ok');
				fields.card_num_fields.each(function(i) {
					$(this).removeClass("field-error").addClass("field-ok");	
				});
			},
			card_num : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num: status ok');
				fields.card_num.removeClass("field-error").addClass("field-ok");
			},
			exp_date_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date_fields: status ok');
				fields.exp_date_fields.each(function(i) {
					$(this).removeClass("field-error").addClass("field-ok");	
				});
			},
			exp_date : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date: status ok');
				fields.exp_date.removeClass("field-error").addClass("field-ok");	
			},
			name_on_card : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('name_on_card: status ok');
				fields.name_on_card.removeClass("field-error").addClass("field-ok");	
			},
			card_cvc : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('name_on_card: status ok');
				fields.card_cvc.removeClass("field-error").addClass("field-ok");						
			},
			sms_code : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('name_on_card: status ok');
				fields.sms_code.removeClass("field-error").addClass("field-ok");	
			}
		},
		error_setter = {
			form : function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('from: status error');
				data['info_form'].removeClass("field-ok").addClass("field-error");
				fields.message.text(text);
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num_fields: status error');
				fields.card_num_fields.each(function(i) {
					$(this).removeClass("field-ok").addClass("field-error");	
				});
			},
			card_num : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num: status error');
				fields.card_num.removeClass("field-ok").addClass("field-error");
			},
			exp_date_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date_fields: status error');
				fields.exp_date_fields.each(function(i) {
					$(this).removeClass("field-ok").addClass("field-error");	
				});
			},
			exp_date : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date: status error');
				fields.exp_date.removeClass("field-ok").addClass("field-error");
			},
			name_on_card : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('name_on_card: status error');
				fields.name_on_card.removeClass("field-ok").addClass("field-error");
			},
			card_cvc : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_cvc: status error');
				fields.card_cvc.removeClass("field-ok").addClass("field-error");
			},
			sms_code : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('sms_code: status error');
				fields.sms_code.removeClass("field-ok").addClass("field-error");
			}
		},
		nothing_setter = {
			form : function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('from: status nothing');
				data['info_form'].removeClass("field-error").removeClass("field-ok");
				fields.message.text('');
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num_fields: status nothing');
				fields.card_num_fields.each(function(i) {
					$(this).removeClass("field-ok").removeClass("field-error");
				});
			},
			card_num : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_num: status nothing');
				fields.card_num.removeClass("field-ok").removeClass("field-error");
			},
			exp_date_fields : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date_fields: status nothing');
				fields.exp_date_fields.each(function(i) {
					$(this).removeClass("field-ok").removeClass("field-error");
				});
			},
			exp_date : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('exp_date: status nothing');
				fields.exp_date.removeClass("field-ok").removeClass("field-error");
			},
			name_on_card : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('name_on_card: status nothing');
				fields.name_on_card.removeClass("field-ok").removeClass("field-error");
			},
			card_cvc : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('card_cvc: status nothing');
				fields.card_cvc.removeClass("field-ok").removeClass("field-error");
			},
			sms_code : function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
				console.log('sms_code: status nothing');
				fields.sms_code.removeClass("field-ok").removeClass("field-error");
			}
		};
	
	var validators = {
		/**
		 * проверка данных карты на frontend'е
		 * @param {array} cardFormParams данные карты из формы
		 * @returns {array}
		 */
		check_card_data: function(cardFormParams, settings) {
			
			var arrErrors = {};
			
			if( (typeof fields.exp_date !== 'undefined' && !validators.exp_date(cardFormParams[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD], settings))
				|| (typeof fields.exp_date_fields !== 'undefined' && !validators.exp_date(cardFormParams[NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD]+"/"+cardFormParams[NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD], settings))
				)
				arrErrors[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD] = 'Пожалуйста, введите действительную дату';
			
			if( (typeof fields.card_num !== 'undefined' && !validators.card_num(cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD], settings))
				||	(typeof fields.card_num_fields !== 'undefined' && !validators.card_num(
						cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD]+cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD]
						+cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD]+cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD], settings))  
				)
				arrErrors[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD] = 'Номер карты введен неверно';
			
			if(!validators.name_on_card(cardFormParams[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD], settings))
				arrErrors[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD] = 'Имя владельца карты введено неверно';
			
			if(!validators.card_cvc(cardFormParams[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD], settings))
				arrErrors[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD] = 'CVC карты введен неверно';
			
			return arrErrors;
		},
		/**
		 * проверка sms-кода на frontend'е
		 * @param {array} codeFormParams дкод подтверждения из формы
		 * @returns {unresolved}
		 */
		check_code_data: function(codeFormParams, settings) {
			
			var arrErrors = [];
			
			if(!validators.sms_code(codeFormParams[NAME_CODE_INPUT_FORM_SMS_CODE_FIELD], settings))
				arrErrors[NAME_CODE_INPUT_FORM_SMS_CODE_FIELD] = 'Пожалуйста, введите правильный СМС-код';
			
			return arrErrors;
		},
		/**
		 * проверка номера карты
		 * @param {string} cardNumber номер карты
		 * @returns {Boolean}
		 */
		card_num: function( cardNumber, settings) {
			// accept only spaces, digits and dashes
			if (/[^0-9 -]+/.test(cardNumber))		
				return false;

			cardNumber = cardNumber.replace(/\D/g, "");			
			if(cardNumber.length < settings.min_card_number_length || cardNumber.length >  settings.max_card_number_length)
				return false;
						
			var nCheck = 0, nDigit = 0,	bEven = false;
	 
	  		for (var n = cardNumber.length - 1; n >= 0 ; n--) {
	  			var cDigit = cardNumber.charAt(n);
	  			var nDigit = parseInt(cDigit, 10);
	  			if (bEven) {
	  				if ((nDigit *= 2) > 9)
	  					nDigit -= 9;
	  			}
	  			nCheck += nDigit;
	  			bEven = !bEven;
	  		}
	  		return (nCheck % 10) == 0;	
		},
		/**
		 * проверка даты
		 * @param {string} expireDate дата в формате mm/yyyy или mm/yy
		 * @returns {Boolean}
		 */
		exp_date: function( expireDate, settings ) {
			var date;
			try {
				date = $.datepicker.parseDate("dd/mm/yy", "01/" + expireDate);
				date = new Date(new Date(date).setMonth(date.getMonth()+1));
			} 
			catch (e) {
				return false;
			}
			return date > (new Date());
		},
		/**
		 * проверка имени владельца карты
		 * @param {string} nameOnCard имя владельца карты
		 * @returns {Boolean}
		 */
		name_on_card: function( nameOnCard, settings ) {
			// accept only spaces, digits and dashes
			if (/[^A-Za-z -]+/.test(nameOnCard))		
				return false;

			nameOnCard = nameOnCard.replace(/[^A-Za-z -]/g, "");			
			if(nameOnCard.length < settings.min_name_on_card_length || nameOnCard.length >  settings.max_name_on_card_length)
				return false;
			
	  		return true;	
		},
		/**
		 * проверка cvc карты
		 * @param {string} сardCvc код cvc
		 * @returns {Boolean}
		 */
		card_cvc: function( cardCvc, settings ) {
			if (/[^0-9]+/.test(cardCvc))		
				return false;
			
			cardCvc = cardCvc.replace(/\D/g, "");
			if(cardCvc.length < settings.min_card_cvc_length || cardCvc.length >  settings.max_card_cvc_length)
				return false;
			
			return true;
		},
		/**
		 * Проверка кода для прохождения sms-check
		 * @param {string} smsCode код из sms
		 * @returns {Boolean}
		 */
		sms_code: function( smsCode, settings ) {
			return (/[0-9]{6}/.test(smsCode));		
		}
	};	
	var handlers = {
		
		/**
		 * определение позиции коретки курсора в поле
		 * 
		 * @param {type} node dom объект поля, в которо происходит позиционирование
		 * @param {type} start
		 * @param {type} end
		 * @returns {jquery.card_payment_form_L31.handlers.caret.jquery.card_payment_formAnonym$4}
		 */
		caret: function (node, start, end) {
			var range;
			if (start !== undefined) {
				if (node.setSelectionRange) {
					node.setSelectionRange(start, end);
				// IE, "else" for opera 10
				} else if (document.selection && document.selection.createRange) {
					range = node.createTextRange();
					range.collapse(true);
					range.moveEnd('character', end);
					range.moveStart('character', start);
					range.select();
				}
			} else {
				start = 0;
				end = 0;
				if ('selectionStart' in node) {
					start = node.selectionStart;
					end = node.selectionEnd;
				} else if (node.createTextRange) {
					range = document.selection.createRange();
					var dup = range.duplicate();

					if (range.parentElement() === node) {
						start = -dup.moveStart('character', -100000);
						end = start + range.text.length;
					}
				}
				return {
					start: start,
					end: end
				};
			}
		},
		/**
		 * обработчик данных при вставке из буфера обмена
		 * для полей карты
		 * 
		 * @param {type} element
		 * @param {type} options
		 * @returns {undefined}
		 */
		after_paste_on_card_num_fields: function (element, options) {
			// for example, inputs value before paste: [00|2 ] [33  ], need paste: 1111
			// now state: [001111|2] [33  ]

			var firstValue = element[0].value,
				caretEnd = handlers.caret(element[0]).end, // in webkit start: 2, end: 6
				left = firstValue.slice(0, caretEnd), // 001111
				right = firstValue.slice(caretEnd), // 2
				rightFreeSpace = options.maxlength - right.length, // 3
				isSetFocus = false,
				buffer, newCaretStart, i;

			for (i = fields.card_num_fields.length - 1; i > options.index; i--) {
				rightFreeSpace += fields.card_num_field_lengths[i] - fields.card_num_fields[i].value.length;
			}

			if (left.length > rightFreeSpace) {
				left = left.slice(0, rightFreeSpace); // 001111.slice(0, 5)
				newCaretStart = rightFreeSpace;
			} else {
				newCaretStart = caretEnd;
			}

			if (firstValue.length > options.maxlength) {
				element[0].value = (left + right).slice(0, options.maxlength); // [0011] [33  ]

				// caret remains on input
				if (newCaretStart <= options.maxlength) {
					 handlers.caret(element[0], newCaretStart, newCaretStart);
					isSetFocus = true;
				}

				buffer = (left + right).slice(options.maxlength); // 112

				if (buffer.length) {
					newCaretStart -= Math.min(options.maxlength, left.length);
					var maxlength, valLength;
					while (fields.card_num_fields[++i]) {
						maxlength = fields.card_num_field_lengths[i];
						buffer += fields.card_num_fields[i].value; // 11233

						fields.card_num_fields.eq(i)
							.val(buffer.slice(0, maxlength))
							.change();

						if (buffer.length <= maxlength) {
							break;
						}

						valLength = fields.card_num_fields[i].value.length;

						if (!isSetFocus) {
							if (newCaretStart < maxlength) {
								isSetFocus = true;
								fields.card_num_fields.eq(i).focus();
								handlers.caret(fields.card_num_fields[i], newCaretStart, newCaretStart);
							}
							newCaretStart -= valLength;
						}
						buffer = buffer.slice(maxlength);
					}
				}
				if (!isSetFocus) {
					// setTimeout may be necessary for chrome and safari (https://bugs.webkit.org/show_bug.cgi?id=56271)
					fields.card_num_fields.eq(i).focus();
					handlers.caret(fields.card_num_fields[i], newCaretStart, newCaretStart);
				}
			}
		},	
		/**
		 * позиционирование коретки курсора в поле и плавный переход между полями
		 * для полей карты
		 * 
		 * @param {type} e
		 * @returns {undefined}
		 */
		reposition_caret_on_card_num_fields: function (e) {
			var eventType = e.type,
				options = e.data,
				element = e.data.element,
				index = e.data.index,
				caretPos;

			if (isOpera) { // last check 12
				if (eventType === 'keypress') {
					eventType = 'keydown';
				}
			}

			var LEFT_CODE = 37,
				BACKSPACE_CODE = 8,
				DELETE_CODE = 46,
				RIGHT_CODE = 39;

				if (eventType === 'keydown' && e.keyCode === RIGHT_CODE) {
					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === this.value.length && // caret is last
						index !== fields.card_num_fields.length - 1 // input is no last
					) {
						fields.card_num_fields.eq(index + 1).focus();
						handlers.caret(fields.card_num_fields[index + 1], 0, 0);
						e.preventDefault(); // no next motion
					}
				}
				if (eventType === 'keydown' && (e.keyCode === BACKSPACE_CODE || e.keyCode === LEFT_CODE)) {
					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === caretPos.end &&
						caretPos.start === 0 && // caret is first
						index !== 0 // input is no first
					) {
						var toFocus = fields.card_num_fields.eq(index - 1),
							lengthToFocus = toFocus.val().length;
						toFocus.focus();
						handlers.caret(toFocus[0], lengthToFocus, lengthToFocus);
						if (e.keyCode === LEFT_CODE) {
							e.preventDefault(); // no next motion
						}
					}
				}
				if (eventType === 'keyup' ||
					eventType === 'keydown') { // repeat in FF10, Webkit, IE
				//case 'keypress': // repeat in FF10, Opera 11
					// ignore system key. ex. shift
					if (e.keyCode < 48) {
						return;
					}

					// ignore ctrl + any key
					if (eventType === 'keyup' && options.ignoreNextKeyup) {
						options.ignoreNextKeyup = false;
						return;
					}
					if (e.metaKey) {
						// metaKey is ignored in browsers on keyup
						options.ignoreNextKeyup = true;
						return;
					}

					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === caretPos.end &&
						caretPos.start === this.value.length && // caret is last
						index !== fields.card_num_fields.length - 1 && // input is no last
						this.value.length === options.maxlength
					) {
						fields.card_num_fields.eq(index + 1).focus();
						handlers.caret(fields.card_num_fields[index + 1], 0, 0);
					}
				}
				if (eventType === 'paste') {
					element.attr(MAXLENGTH_ATTRIBUTE, fields.card_num_fields_total_lengths);
				}
	/*            case 'keypress':
					element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength + 1);
					break;*/
				if (eventType === 'propertychange' || // IE8
					eventType === 'input') { // webkit set cursor position as [00|11112]
					// after paste
					if (element.attr(MAXLENGTH_ATTRIBUTE) !== options.maxlength) {
						// Chrome fix
						setTimeout(function() {
							handlers.after_paste_on_card_num_fields(element, options);
							element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength);
						}, 0);
					}
				}
				if (eventType === 'input' && isOpera) {
					handlers.after_paste_on_card_num_fields(element, options);
				}
		},	
		card_num_fields: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			this.value = this.value.replace(/[^0-9]/g, "");

			var cardNum = '';
			fields.card_num_fields.each(function(i) {
				cardNum += $(this).val();	
			});
				
			if(cardNum.length >= settings.min_card_number_length && cardNum.length <= settings.max_card_number_length)
				if(validators.card_num( cardNum , settings)) ok_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);					
			else nothing_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		card_num: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			var value = this.value = this.value.replace(/[^0-9 -]/g, "");
			
			if(value.length >= settings.min_card_number_length && value.length <= settings.max_card_number_length)
				if(validators.card_num( value , settings)) ok_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
			else 
				nothing_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		
		/**
		 * обработчик данных при вставке из буфера обмена
		 * для полей даты истечения срока действия карты
		 * 
		 * @param {type} element
		 * @param {type} options
		 * @returns {undefined}
		 */
		after_paste_on_exp_date_fields: function (element, options) {
			// for example, inputs value before paste: [00|2 ] [33  ], need paste: 1111
			// now state: [001111|2] [33  ]

			var firstValue = element[0].value,
				caretEnd = handlers.caret(element[0]).end, // in webkit start: 2, end: 6
				left = firstValue.slice(0, caretEnd), // 001111
				right = firstValue.slice(caretEnd), // 2
				rightFreeSpace = options.maxlength - right.length, // 3
				isSetFocus = false,
				buffer, newCaretStart, i;

			for (i = fields.exp_date_fields.length - 1; i > options.index; i--) {
				rightFreeSpace += fields.exp_date_field_lengths[i] - fields.exp_date_fields[i].value.length;
			}

			if (left.length > rightFreeSpace) {
				left = left.slice(0, rightFreeSpace); // 001111.slice(0, 5)
				newCaretStart = rightFreeSpace;
			} else {
				newCaretStart = caretEnd;
			}

			if (firstValue.length > options.maxlength) {
				element[0].value = (left + right).slice(0, options.maxlength); // [0011] [33  ]

				// caret remains on input
				if (newCaretStart <= options.maxlength) {
					 handlers.caret(element[0], newCaretStart, newCaretStart);
					isSetFocus = true;
				}

				buffer = (left + right).slice(options.maxlength); // 112

				if (buffer.length) {
					newCaretStart -= Math.min(options.maxlength, left.length);
					var maxlength, valLength;
					while (fields.exp_date_fields[++i]) {
						maxlength = fields.exp_date_field_lengths[i];
						buffer += fields.exp_date_fields[i].value; // 11233

						fields.exp_date_fields.eq(i)
							.val(buffer.slice(0, maxlength))
							.change();

						if (buffer.length <= maxlength) {
							break;
						}

						valLength = fields.exp_date_fields[i].value.length;

						if (!isSetFocus) {
							if (newCaretStart < maxlength) {
								isSetFocus = true;
								fields.exp_date_fields.eq(i).focus();
								handlers.caret(fields.exp_date_fields[i], newCaretStart, newCaretStart);
							}
							newCaretStart -= valLength;
						}
						buffer = buffer.slice(maxlength);
					}
				}
				if (!isSetFocus) {
					// setTimeout may be necessary for chrome and safari (https://bugs.webkit.org/show_bug.cgi?id=56271)
					fields.exp_date_fields.eq(i).focus();
					handlers.caret(fields.exp_date_fields[i], newCaretStart, newCaretStart);
				}
			}
		},	
		/**
		 * позиционирование коретки курсора в поле и плавный переход между полями
		 * для полей даты истечения срока действия карты
		 * 
		 * @param {type} e
		 * @returns {undefined}
		 */
		reposition_caret_on_exp_date_fields: function (e) {
			var eventType = e.type,
				options = e.data,
				element = e.data.element,
				index = e.data.index,
				caretPos;

			if (isOpera) { // last check 12
				if (eventType === 'keypress') {
					eventType = 'keydown';
				}
			}

			var LEFT_CODE = 37,
				BACKSPACE_CODE = 8,
				DELETE_CODE = 46,
				RIGHT_CODE = 39;

				if (eventType === 'keydown' && e.keyCode === RIGHT_CODE) {
					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === this.value.length && // caret is last
						index !== fields.exp_date_fields.length - 1 // input is no last
					) {
						fields.exp_date_fields.eq(index + 1).focus();
						handlers.caret(fields.exp_date_fields[index + 1], 0, 0);
						e.preventDefault(); // no next motion
					}
				}
				if (eventType === 'keydown' && (e.keyCode === BACKSPACE_CODE || e.keyCode === LEFT_CODE)) {
					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === caretPos.end &&
						caretPos.start === 0 && // caret is first
						index !== 0 // input is no first
					) {
						var toFocus = fields.exp_date_fields.eq(index - 1),
							lengthToFocus = toFocus.val().length;
						toFocus.focus();
						handlers.caret(toFocus[0], lengthToFocus, lengthToFocus);
						if (e.keyCode === LEFT_CODE) {
							e.preventDefault(); // no next motion
						}
					}
				}
				if (eventType === 'keyup' ||
					eventType === 'keydown') { // repeat in FF10, Webkit, IE
				//case 'keypress': // repeat in FF10, Opera 11
					// ignore system key. ex. shift
					if (e.keyCode < 48) {
						return;
					}

					// ignore ctrl + any key
					if (eventType === 'keyup' && options.ignoreNextKeyup) {
						options.ignoreNextKeyup = false;
						return;
					}
					if (e.metaKey) {
						// metaKey is ignored in browsers on keyup
						options.ignoreNextKeyup = true;
						return;
					}

					caretPos = handlers.caret(element[0]);
					if (
						caretPos.start === caretPos.end &&
						caretPos.start === this.value.length && // caret is last
						index !== fields.exp_date_fields.length - 1 && // input is no last
						this.value.length === options.maxlength
					) {
						fields.exp_date_fields.eq(index + 1).focus();
						handlers.caret(fields.exp_date_fields[index + 1], 0, 0);
					}
				}
				if (eventType === 'paste') {
					element.attr(MAXLENGTH_ATTRIBUTE, fields.exp_date_fields_total_lengths);
				}
	/*            case 'keypress':
					element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength + 1);
					break;*/
				if (eventType === 'propertychange' || // IE8
					eventType === 'input') { // webkit set cursor position as [00|11112]
					// after paste
					if (element.attr(MAXLENGTH_ATTRIBUTE) !== options.maxlength) {
						// Chrome fix
						setTimeout(function() {
							handlers.after_paste_on_exp_date_fields(element, options);
							element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength);
						}, 0);
					}
				}
				if (eventType === 'input' && isOpera) {
					handlers.after_paste_on_exp_date_fields(element, options);
				}
		},	
		exp_date_fields: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			if(fields.exp_date_type === 'input'){
				this.value = this.value.replace(/[^0-9]/g, "");
			}
			
			var expireDate = '';
			fields.exp_date_fields.each(function(i) {
				var value = $(this).val();
				var s = value.length - 2;
				expireDate += (expireDate === '' ? value : '/' + value.substring(s,s+2)); 	
			});
						
			if(expireDate.length >= 5)
				if(validators.exp_date( expireDate , settings)) ok_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
			else nothing_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		exp_date: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			var value = this.value = this.value.replace(/[^0-9 /-]/g, "");
			value = value.replace("-", "/");
			if(value.length >= 5)
				if(validators.exp_date( value , settings)) ok_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
			else nothing_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		name_on_card: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			var value = this.value = this.value.replace(/[^A-Za-z -]/g, "");
			
			if(value.length >= settings.min_name_on_card_length && value.length <= settings.max_name_on_card_length)
				if(validators.name_on_card( value , settings)) ok_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
			else nothing_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		card_cvc: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			var value = this.value = this.value.replace(/\D/g, "");
			
			if(value.length >= settings.min_card_cvc_length && value.length <= settings.max_card_cvc_length)
				if(validators.card_cvc( value , settings)) ok_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
				else error_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
			else nothing_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		},
		sms_code: function(fields, validators, settings, ok_setter, error_setter, nothing_setter) {
			var value = this.value = this.value.replace(/\D/g, ""),
			
			value = value.replace(/\D/g, "");
			fields.sms_code.val(value);
			
			if(value.length == SMS_CODE_LENGTH)
				if(validators.sms_code( value, settings )) ok_setter.sms_code.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
				else error_setter.sms_code.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
			else nothing_setter.sms_code.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
		}
	};
	var repliers = {
		ok : function(reply) {
			
			if(reply.message){
				var data = this.data(PLUGIN_NAME);
				
				data['info_form'].addClass("field-ok").removeClass("field-error");
				fields.message.text(reply.message);
				forms.show_form.apply( this , [ID_INFO_FORM]);
			}
			return this;
		},
		submit : function(reply) {

            location.replace(reply.handler);
			return this;
		},
		reload : function(reply) {
			
//			if(!reply.message)
				location.reload();
			// На будущее, тут можно рассмотреть случай с отображением сообщения в модальном окошке
			// и последующего reload'а
			return this;
		},
		show_form : function(reply) {
			if(reply.object) 
				forms.show_form.apply(this, [reply.object]);

			return this;
		},
		error : function(reply) {
			if(reply.message){
				var data = this.data(PLUGIN_NAME);
				data['info_form'].addClass("field-error").removeClass("field-ok");
				fields.message.text(reply.message);
				forms.show_form.apply( this , [ID_INFO_FORM]);
			}
			return this;
		},
		error_in_fields : function(reply) {
			if(reply.fields)
				forms.handle_card_data_errors.apply(this, [reply.fields]);
			return this;
		} 
	};

	var forms = {
		form_state : {
			form_fader : { 
				displayed : false ,
				deep : 0
			}
		},
		
		show_function : {},
		hide_function : {},
		reposition_function : {
			form_fader : function() {
				return this.each(function(){
					var  
						$card_input_form = $(this),
						data = $card_input_form.data(PLUGIN_NAME); 

					var 
						docW = $(document).width(),
						docH = $(document).height();

					data['form_fader']
						.css({ 
							'width':docW,
							'height':docH
						});
				});
			}
		},
				
		show_fader : function() {
			if(forms.form_state.form_fader.displayed !== true){	
				var 
 
					data = this.data(PLUGIN_NAME)
					data['form_fader'].fadeIn("fast");
					forms.form_state.form_fader.displayed = true;
			}
			forms.form_state.form_fader.deep ++;
		},
		hide_fader : function() {
			forms.form_state.form_fader.deep --;
			if(forms.form_state.form_fader.displayed !== false 
				&& forms.form_state.form_fader.deep === 0){	
				var 
 
					$card_input_form = $(this),
					data = this.data(PLUGIN_NAME); 
					data['form_fader'].fadeOut("fast");
					forms.form_state.form_fader.displayed = false;
			}
		},
		
		reposition : function() {
			for(var n in forms.reposition_function)
				if(forms.reposition_function[n] && typeof forms.reposition_function[n] === "function")
					forms.reposition_function[n].apply(this);
		}, 
		show_form : function(form_name) {
	
			var nDeep = 0;
			
			// Сдесь надо проверить открыта ли форма, если да, то спрятать и проставить диип
			if(forms.form_state.form_fader.displayed === true)
				for(var n in forms.form_state) {
					if(forms.form_state[n].displayed === true && n === form_name)
						return;
					if(forms.form_state[n].displayed === true && n !== 'form_fader') {
						forms.hide_function[n].apply(this);
						nDeep = forms.form_state[n].deep;
					}
				}
			
			nDeep ++;
			forms.show_fader.apply(this);
			if(forms.show_function[form_name] && typeof forms.show_function[form_name] === "function")
				forms.show_function[form_name].apply(this);
			
			if(forms.form_state[form_name]) {
				forms.form_state[form_name].displayed = true;
				forms.form_state[form_name].deep = nDeep;
			}
			else 
				forms.form_state[form_name] = {
					displayed: true,
					deep: nDeep
				};
		},
		hide_form : function(form_name) {
			// ищем форму с предыдущим deep и открываем её
			if(forms.hide_function[form_name] && typeof forms.hide_function[form_name] === "function")
				forms.hide_function[form_name].apply(this);
			forms.hide_fader.apply(this);
			
			var nDeep = forms.form_state[form_name].deep - 1;
			if(forms.form_state[form_name]) {
				forms.form_state[form_name].displayed = false;
				forms.form_state[form_name].deep = 0;
			}
			
			if(forms.form_state.form_fader.displayed === true) {
				for(var n in forms.form_state) 
					if(forms.form_state[n].displayed === true && nDeep === forms.form_state[n].deep && n !== 'form_fader') 
						forms.show_function[n].apply(this);
			}
			else 
				for(var n in forms.form_state) 
					if(forms.form_state[n].displayed === true && n !== 'form_fader'){
						forms.form_state[n].displayed = false;
						forms.form_state[n].deep = 0;
					}
		},
		
		get_card_data : function( step ) { 
			var data = this.data(PLUGIN_NAME),
				arr = {};
			
			if(step === ID_CARD_INPUT_FORM){
				arr.name_on_card = fields.name_on_card.val();
				arr.card_cvc = fields.card_cvc.val();

				if(typeof fields.card_num !== 'undefined') {
					arr.card_num = fields.card_num.val();
				}
				else if(typeof fields.card_num_fields !== 'undefined'){				
					fields.card_num_fields.each(function(i) {
						var element = $(this);
						arr[element.attr('name')] = element.val();	
					});
				}
				
				if(typeof fields.exp_date !== 'undefined') {
					arr.exp_date = fields.exp_date.val();
				}
				else if(typeof fields.exp_date_fields !== 'undefined'){
					fields.exp_date_fields.each(function(i) {
						var element = $(this);
						arr[element.attr('name')] = element.val();	
					});
				}
			}	
			if(step === ID_CODE_INPUT_FORM)
				arr.sms_code = fields.sms_code.val()
			
			arr.customer = customer;
			if(typeof key !== 'undefined')
				arr.key = key;
			
			return arr;
		},		
		handle_card_data_errors : function( arr_fields ) { 		
				var data = this.data(PLUGIN_NAME);
				if(arr_fields.form)
					error_setter.form.apply(this, [data, arr_fields.form, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter]);

				if(arr_fields.card_num){
					if(typeof fields.card_num !== 'undefined') 
						error_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
					else if(typeof fields.card_num_fields !== 'undefined')
						error_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
				}
				
				if(arr_fields.card_cvc)
					error_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
				
				if(arr_fields.exp_date){
					if(typeof fields.exp_date !== 'undefined') 
						error_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
					else if(typeof fields.exp_date_fields !== 'undefined')
						error_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
				}
				
				if(arr_fields.name_on_card)
					error_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
	
				if(arr_fields.sms_code)
					error_setter.sms_code.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);	
			}
	};

	var methods = {
		
		init : function( override_options ) {
			/*
			 * Совмещаем настройки
			 */
			settings = $.extend( default_settings, override_options);
			if(Object.keys(settings.ok_setter).length > 0)
				for(var strFunctionName in settings.ok_setter)
					if(typeof settings.ok_setter[strFunctionName] === 'function' && typeof ok_setter[strFunctionName] === 'function')
						ok_setter[strFunctionName] = settings.ok_setter[strFunctionName];
			if(Object.keys(settings.error_setter).length > 0)
				for(var strFunctionName in settings.error_setter)
					if(typeof settings.error_setter[strFunctionName] === 'function' && typeof error_setter[strFunctionName] === 'function')
						error_setter[strFunctionName] = settings.error_setter[strFunctionName];
			if(Object.keys(settings.nothing_setter).length > 0)
				for(var strFunctionName in settings.nothing_setter)
					if(typeof settings.nothing_setter[strFunctionName] === 'function' && typeof nothing_setter[strFunctionName] === 'function')
						nothing_setter[strFunctionName] = settings.nothing_setter[strFunctionName];
			if(Object.keys(settings.validators).length > 0)
				for(var strFunctionName in settings.validators)
					if(typeof settings.validators[strFunctionName] === 'function' && typeof validators[strFunctionName] === 'function')
						validators[strFunctionName] = settings.validators[strFunctionName];
			if(Object.keys(settings.handlers).length > 0)
				for(var strFunctionName in settings.handlers)
					if(typeof settings.handlers[strFunctionName] === 'function' && typeof handlers[strFunctionName] === 'function')
						handlers[strFunctionName] = settings.handlers[strFunctionName];
			if(Object.keys(settings.repliers).length > 0)
				for(var strFunctionName in settings.repliers)
					if(typeof settings.repliers[strFunctionName] === 'function' && typeof repliers[strFunctionName] === 'function')
						repliers[strFunctionName] = settings.repliers[strFunctionName];
			
			
			var  $form = $(this),
				data = $form.data(PLUGIN_NAME); 

			
			//
			// Если плагин ещё не проинициализирован
			//
			if ( ! data ) {

				var requestedUrl = undefined, urlParams = {};
				(function () {
					requestedUrl = window.location.href.slice(0,window.location.href.indexOf('\?'))
					
					var e,
						a = /\+/g,  // Regex for replacing addition symbol with a space
						r = /([^&=]+)=?([^&]*)/g,
						d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
						q = window.location.search.substring(1);

					while (e = r.exec(q))
					   urlParams[d(e[1])] = d(e[2]);
				})();
				
				request_url = requestedUrl; 
				customer = urlParams['customer'];
				key = urlParams['key'];

				/*
				 * Инициализация допустимых длин полей
				 */
				if(typeof settings.min_card_number_length === 'undefined' || typeof settings.max_card_number_length === 'undefined'){
					var min_card_number_length = undefined, max_card_number_length = undefined;
					for(var n in settings.accepted_card_brands){
						if(settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'VISA' ||
							settings.accepted_card_brands[n] === 'VISA ELECTRON' || settings.accepted_card_brands[n] === 'DISCOVER'
                                                        || settings.accepted_card_brands[n] === 'JCB') {	
							min_card_number_length = min_card_number_length > 16 || typeof min_card_number_length == 'undefined' ? 16 : min_card_number_length;
							max_card_number_length = max_card_number_length < 16 || typeof max_card_number_length == 'undefined' ? 16 : max_card_number_length;
						}
						else if( settings.accepted_card_brands[n] === 'MAESTRO' ){
							min_card_number_length = min_card_number_length > 16 || typeof min_card_number_length == 'undefined' ? 16 : min_card_number_length;
							max_card_number_length = max_card_number_length < 19 || typeof max_card_number_length == 'undefined' ? 19 : max_card_number_length;
						}
						else if( settings.accepted_card_brands[n] === 'AMERICAN EXPRESS' ){
							min_card_number_length = min_card_number_length > 15 || typeof min_card_number_length == 'undefined' ? 15 : min_card_number_length;
							max_card_number_length = max_card_number_length < 15 || typeof max_card_number_length == 'undefined' ? 15 : max_card_number_length;
						}
						else if( settings.accepted_card_brands[n] === 'DINERS CLUB' ){
							min_card_number_length = min_card_number_length > 14 || typeof min_card_number_length == 'undefined' ? 14 : min_card_number_length;
							max_card_number_length = max_card_number_length < 14 || typeof max_card_number_length == 'undefined' ? 14 : max_card_number_length;
						}	
					}

					settings.min_card_number_length = min_card_number_length;
					settings.max_card_number_length = max_card_number_length;
				}
				if(typeof settings.min_card_cvc_length === 'undefined' || typeof settings.max_card_cvc_length === 'undefined') {
					var min_card_cvc_length = undefined, max_card_cvc_length = undefined;
					for(var n in settings.accepted_card_brands){
						if(settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'MAESTRO' || 
							settings.accepted_card_brands[n] === 'VISA' || settings.accepted_card_brands[n] === 'VISA ELECTRON' ||
							settings.accepted_card_brands[n] === 'DINERS CLUB'  || settings.accepted_card_brands[n] === 'DISCOVER'
                                                        || settings.accepted_card_brands[n] === 'JCB') {
							min_card_cvc_length = min_card_cvc_length > 3 || typeof min_card_cvc_length == 'undefined' ? 3 : min_card_cvc_length;
							max_card_cvc_length = max_card_cvc_length < 3 || typeof max_card_cvc_length == 'undefined' ? 3 : max_card_cvc_length;
						}
						else if( settings.accepted_card_brands[n] === 'AMERICAN EXPRESS' ){
							min_card_cvc_length = min_card_cvc_length > 4 || typeof min_card_cvc_length == 'undefined' ? 4 : min_card_cvc_length;
							max_card_cvc_length = max_card_cvc_length < 4 || typeof max_card_cvc_length == 'undefined' ? 4 : max_card_cvc_length;
						}	
					}
					settings.min_card_cvc_length = min_card_cvc_length;
					settings.max_card_cvc_length = max_card_cvc_length;
				}
				if(typeof settings.min_name_on_card_length === 'undefined' || typeof settings.max_name_on_card_length === 'undefined') {
					var min_name_on_card_length = undefined, max_name_on_card_length = undefined;
					for(var n in settings.accepted_card_brands){
						if(settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'MAESTRO' || 
							settings.accepted_card_brands[n] === 'VISA' || settings.accepted_card_brands[n] === 'VISA ELECTRON' ||
							settings.accepted_card_brands[n] === 'DINERS CLUB'  || settings.accepted_card_brands[n] === 'DISCOVER'
                                                        || settings.accepted_card_brands[n] === 'JCB') {
							min_name_on_card_length = min_name_on_card_length > 3 || typeof min_name_on_card_length == 'undefined' ? 3 : min_name_on_card_length;
							max_name_on_card_length = max_name_on_card_length < 27 || typeof max_name_on_card_length == 'undefined' ? 27 : max_name_on_card_length;
						}
						else if( settings.accepted_card_brands[n] === 'AMERICAN EXPRESS'  ){
							min_name_on_card_length = min_name_on_card_length > 4 || typeof min_name_on_card_length == 'undefined' ? 4 : min_name_on_card_length;
							max_name_on_card_length = max_name_on_card_length < 27 || typeof max_name_on_card_length == 'undefined' ? 27 : max_name_on_card_length;
						}	
					}
					settings.min_name_on_card_length = min_name_on_card_length;
					settings.max_name_on_card_length = max_name_on_card_length;
				}
				
				if(settings.form_type === 'card_form') 
					methods.init_card_input_form.apply($form);
				else if(settings.form_type === 'loader_form')
					methods.init_loader_form.apply($form);
				else if(settings.form_type === 'only_sms_check_form')
					methods.init_loader_form.apply($form);
				
				var 
				// ---
					$form_fader = methods.init_form_fader.apply($form),
					$code_input_form = methods.init_code_input_form.apply($form),
					$info_form = methods.init_info_form.apply($form);

				$form.data(PLUGIN_NAME, {
						'loader_form' : $form,
						'card_input_form' : $form,
						'form_fader' : $form_fader,
						'code_input_form' : $code_input_form,
						'info_form' : $info_form
					});	
					
				//
				// Прикрепляем реакцию на смену размеров окна
				//
				$(window).bind('resize.'+ PLUGIN_NAME, function(e) {
					e.preventDefault();
					forms.reposition.apply( $form );
				});

			}

			return this;
		},
		init_form_fader : function () {
			var $card_input_form = $(this),
				form_fader = $('<div></div>')
						.attr({
							'id': ID_FORM_FADER,
							'class': ID_FORM_FADER
						});
			$(document.body)
					.append(form_fader);

			return $('#' + ID_FORM_FADER);
		},
		init_card_input_form : function () {
			var  $card_input_form = $(this);
			/*
			 * Определение набора полей и привяска реакции на события 
			 */	
			fields.card_num = fields.card_num_fields = $("input[name^="+NAME_CARD_INPUT_FORM_CARD_NUM_FIELD+"]", $card_input_form);	
			if(fields.card_num_fields.length === 1) {
				fields.card_num_fields = undefined;
				fields.card_num
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						});
			}
			else if(fields.card_num_fields.length > 1) {
				fields.card_num = undefined;
				fields.card_num_fields.each(function(i) {
					var element = $(this),
						maxlength = +element.attr(MAXLENGTH_ATTRIBUTE);

					fields.card_num_fields_total_lengths += maxlength;
					fields.card_num_field_lengths.push(maxlength);

					element
						.attr({
							'autocomplete': 'off'
						})
						.on('keydown keypress keyup input paste propertychange', {
							element: element,
							index: i,
							maxlength: maxlength
						}, handlers.reposition_caret_on_card_num_fields)
						.keyup (function (e) {
							e.preventDefault();
							handlers.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						}
					);
				});
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для ввода номера банковской карты');

			var 
				$expireDateInputs = $("input[name="+NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD+"], input[name="+NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD+"]", $card_input_form),
				$expireDateSelectors = $("select[name="+NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD+"], select[name="+NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD+"]", $card_input_form)	;	

			fields.exp_date = $("input[name="+NAME_CARD_INPUT_FORM_EXP_DATE_FIELD+"]", $card_input_form);
			if(fields.exp_date.length === 1) {
				fields.exp_date_fields = undefined;
				fields.exp_date
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
					function (e) {
						e.preventDefault();
						handlers.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
					});
				fields.exp_date_type = 'input';
			}
			else if($expireDateInputs.length === 2) {
				fields.exp_date = undefined;
				fields.exp_date_fields = $expireDateInputs;
				fields.exp_date_type = 'input';
				fields.exp_date_fields.each(function(i) {
					var element = $(this),
						maxlength = +element.attr(MAXLENGTH_ATTRIBUTE);

					fields.exp_date_fields_total_lengths += maxlength;
					fields.exp_date_field_lengths.push(maxlength);

					element
						.attr({
							'autocomplete': 'off'
						})
						.on('keydown keypress keyup input paste propertychange', {
							element: element,
							index: i,
							maxlength: maxlength
						}, handlers.reposition_caret_on_exp_date_fields)
						.keyup (function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						}
					);
				});
			}
			else if($expireDateSelectors.length === 2) {
				fields.exp_date = undefined;
				fields.exp_date_fields = $expireDateSelectors;
				fields.exp_date_type = 'select';
				fields.exp_date_fields.each(function(i) {
					var element = $(this);

					element
						.change(function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						}
					);
				});
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для даты истечения банковской карты');

			fields.name_on_card = $("input[name="+NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD+"]", $card_input_form);
			if(fields.name_on_card.length === 1) {
				fields.name_on_card
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						})
					.change(
						function (e) {
							e.preventDefault();
							handlers.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						});
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для имени владельца карты');

			fields.card_cvc = $("input[name="+NAME_CARD_INPUT_FORM_CARD_CVC_FIELD+"]", $card_input_form);
			if(fields.card_cvc.length === 1) {
				fields.card_cvc
					.attr({
						'maxlength' : settings.max_card_cvc_length,
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						});
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для cvc карты');

			//
			// Нажатие кнопки оплаты
			//
			$('form',$card_input_form)
					.bind('submit.'+ PLUGIN_NAME, function(e) {
						e.preventDefault();

//						forms.show_form.apply($card_input_form, [ID_CODE_INPUT_FORM])
						methods.check_card_data.apply( $card_input_form );
						return false;
					});

			return $card_input_form;
		},		
		init_loader_form : function () {
			var  $loader_form = $(this);
			$("#"+ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION, $loader_form).hide();
			tick.set(true);

			(function tickFunction()
			{
				if(tick.get())
					methods.get_action.apply( $loader_form );

				setTimeout(tickFunction, LOADER_REFERSH_ACTION_TIMEOUT * 1000);
			})();
			
			setTimeout(
				function showHoldTransactionInformation() {
					tick.set(false);
					$("#"+ID_LOADER_FORM_INFO_BY_IDLE_TRANSACTION, $loader_form).hide();
					$("#"+ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION, $loader_form).show();
				}
				, LOADER_SHOTDOWN_TIMEOUT * 1000);

			return $loader_form;
		},
		init_code_input_form : function () {
			var $card_input_form = $(this),
			// ---
				code_info_row = $('<div></div>').text('Просим вас ввести код, полученный в СМС-сообщении'),
				code_info2_row = $('<div></div>').text('Если код не пришёл на ваш телефон, вы сможете отправить его через '+SMS_CODE_REFRESH_TIMEOUT+' секунд'),
				code_input_field = $('<input>')
						.attr({
							'type': "text",
							'class': 'sms-code',
							'name': NAME_CODE_INPUT_FORM_SMS_CODE_FIELD,
							'maxlength': 6,
							'autocomplete': "off",
							'placeholder': 'XXXXXX'						//'Введите код пришедший на телефон'
						}),	
				code_refresh_button = $('<button></button>')
						.attr({ 'class': "refresh_button" , 'title': "Отправить код"})
						.bind('click.'+ PLUGIN_NAME, function(e) {
							e.preventDefault();
//							forms.show_form.apply($card_input_form, [ID_INFO_FORM])
							methods.refresh_sms_code.apply( $card_input_form );
						}),
				code_input_row = $('<div></div>').append(code_input_field).append(code_refresh_button),
				code_send_button = $('<button></button>').attr({'class': "send_button"}).text("Проверить")
						.bind('click.'+ PLUGIN_NAME,function(e) {
							e.preventDefault();
//							forms.show_form.apply($card_input_form, [ID_INFO_FORM])
							methods.check_sms_code.apply( $card_input_form );
						}),
				code_cancel_button = $('<button></button>').attr({'class': "cancel_button"}).text("Отказаться")
						.bind('click.'+ PLUGIN_NAME ,function(e) {
							e.preventDefault();
							methods.cancel_transaction.apply( $card_input_form );
						}),
				code_buttons_row = $('<div></div>').append(code_send_button).append(code_cancel_button),
				code_input_form = $('<form></form>')
						.append(code_info_row)
						.append(code_input_row)
						.append(code_buttons_row)
						.append(code_info2_row),
				code_input_form_container = $('<div></div>')
						.attr('id', ID_CODE_INPUT_FORM)
						.attr('class',ID_CODE_INPUT_FORM)
						.append(code_input_form);
			// ---
			$(document.body)
					.append(code_input_form_container);
			
			var 
					$code_input_form = $('#' + ID_CODE_INPUT_FORM),
					$code_input_form_refresh_button = $('.refresh_button' , $code_input_form),
					$code_input_form_send_button = $('.send_button' , $code_input_form),
					$code_input_form_cancel_button = $('.cancel_button' , $code_input_form),
					$code_input_form_sms_code_field = $('.sms-code' , $code_input_form);
			
			//
			// Валидация полей
			//
			if($code_input_form_sms_code_field.size() > 0) {
				$code_input_form_sms_code_field.keyup(
						function (e) {
							e.preventDefault();
							handlers.sms_code.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
						});
				fields.sms_code = $code_input_form_sms_code_field;
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для ввода sms кода');

			
			forms.show_function.code_input_form = function() { 

				var data = this.data(PLUGIN_NAME);
				
				tick.set(false);
				
				$('.refresh_button' , data['code_input_form']).attr({'disabled' : true}).removeClass('active').addClass('no-active');
				setTimeout(function () {
					$('.refresh_button' , data['code_input_form']).attr({'disabled' : false}).removeClass('no-active').addClass('active');
				},
				SMS_CODE_REFRESH_TIMEOUT * 1000);
				
				forms.reposition.apply( data['card_input_form'] );
				data['code_input_form'].fadeIn("fast");
				
				//$('#mask').fadeTo("slow",0.8);
				return this;
			};	
			forms.hide_function.code_input_form = function() { 

				var data = this.data(PLUGIN_NAME);
				
				tick.set(true);

				$('input', data['code_input_form']).val('');
				data['code_input_form'].fadeOut("fast");
				return this;
			};
			forms.reposition_function.code_input_form = function() { 
				var 
					data = this.data(PLUGIN_NAME); 

				var winH = $(window).height(),
					winW = $(window).width();

				data['code_input_form']
					.css({
						'top': winH/2-data['code_input_form'].height()/2,
						'left': winW/2-data['code_input_form'].width()/2
					});
				return this;
			};
	
			return $code_input_form;
		},
		init_info_form : function () {
			var $card_input_form = $(this),
			// ---
			info_message_row = $('<div></div>')
				.attr({
						'name': NAME_INFO_FORM_MESSAGE_FIELD,
						'class': NAME_INFO_FORM_MESSAGE_FIELD,
					}),
			info_ok_button = $('<button></button>')
					.attr({'class': "ok_button"})
					.text("Ok")
					.bind('click.'+ PLUGIN_NAME, function(e){
						e.preventDefault();
						forms.hide_form.apply( $card_input_form , [ID_INFO_FORM]);
					}),
			info_button_row = $('<div></div>').append(info_ok_button),
			info_form_container = $('<div></div>')
					.attr('id', ID_INFO_FORM)
					.attr('class',ID_INFO_FORM)
					.append(info_message_row)
					.append(info_button_row);
			// ---
			$(document.body)
					.append(info_form_container);
			
			var 
					$info_form = $('#' + ID_INFO_FORM),
					$info_form_message_field = $('.message' , $info_form),
					$info_form_ok_button = $('.ok_button' , $info_form);

			fields.message = $info_form_message_field;
			
			forms.show_function.info_form = function() { 
				var data = this.data(PLUGIN_NAME);

				forms.reposition.apply( $card_input_form )
				data['info_form'].fadeIn("fast");
				//$('#mask').fadeTo("slow",0.8);
				return this;
			};	
			forms.hide_function.info_form = function() { 
				
				var data = this.data(PLUGIN_NAME);

				data['info_form'].fadeOut("fast", function() {
					fields.message.text('');
					$(this).removeClass("field-ok").removeClass("field-error");
				});
				return this;
			};
			forms.reposition_function.info_form = function() { 
				var 
					data = this.data(PLUGIN_NAME); 

				var winH = $(window).height(),
					winW = $(window).width();

				data['info_form']
					.css({
						'top': winH/2-data['info_form'].height()/2,
						'left': winW/2-data['info_form'].width()/2
					});
				return this;
			};

			return $info_form;
		},
		destroy : function() {
			return this.each(function(){
				$(window).unbind(PLUGIN_NAME);
//					data.tooltip.remove();										// Не помню, что это значит
				$(window).removeData(PLUGIN_NAME);
			})
		},
//
		get_action: function() {
			return this.each(function(){
				var  
					$loader_form = $(this),
					data = $loader_form.data(PLUGIN_NAME),
					
					arrLoaderFromParams = forms.get_card_data.apply( $loader_form , [ID_LOADER_FORM] );
				
				arrLoaderFromParams.action = 'get_action';
                arrCardFormParams.form_type = settings.form_type;
				$.postJSON(
					request_url,
					arrLoaderFromParams,
					function (data, textStatus) {
						if('success' != textStatus) {
							methods.display_error('can not request action');
							return;
						}
//						console.log(data);
						repliers[data.action].apply($loader_form,[data])
					}
				);
			});
		},

		check_card_data : function() { 
			return this.each(function(){
				var  
					$card_input_form = $(this),
					data = $card_input_form.data(PLUGIN_NAME),
					
					arrCardFormParams = forms.get_card_data.apply( $card_input_form , [ID_CARD_INPUT_FORM] ),
					arrCardFormErrors = validators.check_card_data( arrCardFormParams, settings);
				
//				console.log(arrCardFormParams);
				
				forms.handle_card_data_errors.apply( $card_input_form , [arrCardFormErrors] );
                arrCardFormParams.form_type = settings.form_type;

				if(Object.keys(arrCardFormErrors).length > 0)
					return ;
				
				arrCardFormParams.action = 'check_card_data';
				$.postJSON(
					request_url,
					arrCardFormParams,
					function (data, textStatus) {
						if('success' != textStatus) {
							methods.display_error('can not check card data');
							return;
						}
						console.log(data);
						repliers[data.action].apply($card_input_form,[data])
					}
				);
			});
		},					
		check_sms_code : function() { 
			return this.each(function(){
				var  
					$card_input_form = $(this),
					data = $card_input_form.data(PLUGIN_NAME),
					
					arrCardFormParams = forms.get_card_data.apply( $card_input_form , [ID_CODE_INPUT_FORM] ),
					arrCardFormErrors = validators.check_code_data( arrCardFormParams, settings );
					
//				console.log(arrCardFormParams);
				
				forms.handle_card_data_errors.apply( $card_input_form , [arrCardFormErrors] );			

				if(Object.keys(arrCardFormErrors).length > 0)
					return ;
				
				arrCardFormParams.action = 'check_sms_code';
				arrCardFormParams.form_type = settings.form_type;
				$.postJSON(
					request_url,
					arrCardFormParams,
					function (data, textStatus) {
						if('success' != textStatus) {
							methods.display_error('can not check card data');
							return;
						}
//						console.log(data);
						repliers[data.action].apply($card_input_form,[data])
					}
				);
			});
		},
		refresh_sms_code : function() { 
			return this.each(function(){
				var  
					$card_input_form = $(this),
					data = $card_input_form.data(PLUGIN_NAME),
					
					arrCardFormParams = forms.get_card_data.apply( $card_input_form , ['refresh_sms_code'] );
					
//				console.log(arrCardFormParams);		

				arrCardFormParams.action = 'refresh_sms_code';
                arrCardFormParams.form_type = settings.form_type;
				$.postJSON(
					request_url,
					arrCardFormParams,
					function (data, textStatus) {
						if('success' != textStatus) {
							methods.display_error('can not check card data');
							return;
						}
//						console.log(data);
						repliers[data.action].apply($card_input_form,[data])
					}
				);
					
				$('.refresh_button' , data['code_input_form']).attr({'disabled' : true}).removeClass('active').addClass('no-active');
				setTimeout(function () {
					$('.refresh_button' , data['code_input_form']).attr({'disabled' : false}).removeClass('no-active').addClass('active');
				},
				SMS_CODE_REFRESH_TIMEOUT * 1000);
			});
		},
		cancel_transaction : function() { 
			return this.each(function(){
				var  
					$card_input_form = $(this),
					data = $card_input_form.data(PLUGIN_NAME),
					
					arrCardFormParams = forms.get_card_data.apply( $card_input_form , ['refresh_sms_code'] );
					
//				console.log(arrCardFormParams);		

				arrCardFormParams.action = 'cancel_transaction';
                arrCardFormParams.form_type = settings.form_type;
				$.postJSON(
					request_url,
					arrCardFormParams,
					function (data, textStatus) {
						if('success' != textStatus) {
							methods.display_error('can not check card data');
							return;
						}
						console.log(data);
						repliers[data.action].apply($card_input_form,[data])
					}
				);
			});
		}
	};

	$.fn.card_payment_form = function( method ) {

		if ( methods[method] ) {	
			var _return = methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
			// opera not support paste event
			if (isOpera) {
				if(typeof fields.card_num_fields !== undefined) fields.card_num_fields.attr(MAXLENGTH_ATTRIBUTE, fields.card_num_fields_total_lengths);
				if(typeof fields.exp_date_fields !== undefined) fields.exp_date_fields.attr(MAXLENGTH_ATTRIBUTE, fields.exp_date_fields_total_lengths);
			}
			return _return;
		} 
		else if ( typeof method === 'object' || ! method ) {
			var _return = methods.init.apply( this, arguments );
			// opera not support paste event
			if (isOpera) {
				if(typeof fields.card_num_fields !== undefined) fields.card_num_fields.attr(MAXLENGTH_ATTRIBUTE, fields.card_num_fields_total_lengths);
				if(typeof fields.exp_date_fields !== undefined) fields.exp_date_fields.attr(MAXLENGTH_ATTRIBUTE, fields.exp_date_fields_total_lengths);
			}
			return _return;
		} 
		else {
			$.error( 'Метод с именем ' +  method + ' не существует для jQuery.card_payment_form' );
		}    

	};

})( jQuery );
