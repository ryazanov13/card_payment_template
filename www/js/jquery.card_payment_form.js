if (!window.console) console = {log: function() {}}; // В IE нет класса console

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
 */
(function( $ ){

	// Constants
	PLUGIN_NAME = 'card_payment_form',
	SMS_CODE_LENGTH = 6,
	//
	// Таймаут до появления кнопки обновления смс-кода
	// 
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
	
	NAME_CARD_INPUT_FORM_HASH_CODE_FIELD = 'hash_code',
	
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
			'accepted_card_brands' : [ 'VI', 'CA' ],
			'min_card_number_length' : undefined,
			'max_card_number_length' : undefined,
			'min_card_cvc_length' : undefined,
			'max_card_cvc_length' : undefined,
			'min_name_on_card_length' : undefined,
			'max_name_on_card_length' : undefined,
			
			// Обрпботчики для отображения ошибок
			'ok_seter' : [],
			'error_seter' : [],
			'nothing_seter' : [],
			// Валидаторы для подмены
			'validators' : [],
			// Обработчики привязываемые к полям
			'handlers' : [],
			'repliers' : []
		},
		settings = {},
		fields = {
			'card_num_fields' : [],
			'card_num' : undefined,
			'exp_date_fields' : [],
			'exp_date' : undefined,
			'exp_date_type' : undefined,
			'name_on_card' : undefined,
			'card_cvc' : undefined,
			'sms_code' : undefined,
			'hash_code' : undefined
		};
	
	var 
		ok_seter = {	
			form : function (data, text, forms, fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('from: status ok');
				data['info_form'].removeClass("field-error").addClass("field-ok");
				fields.message.text('');
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num_fields: status ok');
				for(var n in fields.card_num_fields)
					fields.card_num_fields[n].removeClass("field-error").addClass("field-ok");	
			},
			card_num : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num: status ok');
				fields.card_num.addClass("field-ok").removeClass("field-error");
			},
			exp_date_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date_fields: status ok');
				for(var n in fields.exp_date_fields) 
					fields.exp_date_fields[n].addClass("field-ok").removeClass("field-error");
			},
			exp_date : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date: status ok');
				fields.exp_date.addClass("field-ok").removeClass("field-error");	
			},
			name_on_card : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('name_on_card: status ok');
				fields.name_on_card.addClass("field-ok").removeClass("field-error");	
			},
			card_cvc : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('name_on_card: status ok');
				fields.card_cvc.addClass("field-ok").removeClass("field-error");						
			},
			sms_code : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('name_on_card: status ok');
				fields.sms_code.addClass("field-ok").removeClass("field-error");	
			}
		},
		error_seter = {
			form : function (data, text, forms, fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('from: status error');
				data['info_form'].addClass("field-error").removeClass("field-ok");
				fields.message.text(text);
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num_fields: status error');
				for(var n in fields.card_num_fields)
					fields.card_num_fields[n].removeClass("field-ok").addClass("field-error");		
			},
			card_num : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num: status error');
				fields.card_num.removeClass("field-ok").addClass("field-error");
			},
			exp_date_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date_fields: status error');
				for(var n in fields.exp_date_fields) 
					fields.exp_date_fields[n].addClass("field-error").removeClass("field-ok");
			},
			exp_date : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date: status error');
				fields.exp_date.removeClass("field-ok").addClass("field-error");
			},
			name_on_card : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('name_on_card: status error');
				fields.name_on_card.removeClass("field-ok").addClass("field-error");
			},
			card_cvc : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_cvc: status error');
				fields.card_cvc.removeClass("field-ok").addClass("field-error");
			},
			sms_code : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('sms_code: status error');
				fields.sms_code.removeClass("field-ok").addClass("field-error");
			}
		},
		nothing_seter = {
			form : function (data, text, forms, fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('from: status nothing');
				data['info_form'].removeClass("field-error").removeClass("field-ok");
				fields.message.text('');
				forms.show_form.apply( this , [ID_INFO_FORM]);
			},
			card_num_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num_fields: status nothing');
				for(var n in fields.card_num_fields) 
					fields.card_num_fields[n].removeClass("field-ok").removeClass("field-error");
			},
			card_num : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_num: status nothing');
				fields.card_num.removeClass("field-ok").removeClass("field-error");
			},
			exp_date_fields : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date_fields: status nothing');
				for(var n in fields.exp_date_fields) 
					fields.exp_date_fields[n].removeClass("field-ok").removeClass("field-error");
			},
			exp_date : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('exp_date: status nothing');
				fields.exp_date.removeClass("field-ok").removeClass("field-error");
			},
			name_on_card : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('name_on_card: status nothing');
				fields.name_on_card.removeClass("field-ok").removeClass("field-error");
			},
			card_cvc : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('card_cvc: status nothing');
				fields.card_cvc.removeClass("field-ok").removeClass("field-error");
			},
			sms_code : function (fields, validators, settings, ok_seter, error_seter, nothing_seter) {
				console.log('sms_code: status nothing');
				fields.sms_code.removeClass("field-ok").removeClass("field-error");
			}
		};
	
	var validators = {
		/**
		 * проверка данных карты
		 * @param {array} arrCardFormParams
		 * @returns {array}
		 */
		check_card_data: function(arrCardFormParams, settings) {
			
			var arrErrors = {};
			
			if( (typeof fields.exp_date !== 'undefined' && !validators.exp_date(arrCardFormParams[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD], settings))
				|| (Object.keys(fields.exp_date_fields).length && !validators.exp_date(arrCardFormParams[NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD]+"/"+arrCardFormParams[NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD], settings))
				)
				arrErrors[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD] = 'Пожалуйста, введите действительную дату';
			
			if( (typeof fields.card_num !== 'undefined' && !validators.card_num(arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD], settings))
				||	(Object.keys(fields.card_num_fields).length && !validators.card_num(
						arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD]+arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD]
						+arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD]+arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD], settings))  
				)
				arrErrors[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD] = 'Номер карты введен неверно';
			
			if(!validators.name_on_card(arrCardFormParams[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD], settings))
				arrErrors[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD] = 'Имя владельца карты введен неверно';
			
			if(!validators.card_cvc(arrCardFormParams[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD], settings))
				arrErrors[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD] = 'CVC карты введен неверно';
			
			return arrErrors;
		},
		/**
		 * 
		 * @param {array} arrCodeFormParams
		 * @returns {unresolved}
		 */
		check_code_data: function(arrCodeFormParams, settings) {
			
			var arrErrors = [];
			
			if(!validators.sms_code(arrCodeFormParams[NAME_CODE_INPUT_FORM_SMS_CODE_FIELD], settings))
				arrErrors[NAME_CODE_INPUT_FORM_SMS_CODE_FIELD] = 'Пожалуйста, введите правельный sms код';
			
			return arrErrors;
		},
		/**
		 * проверка номера карты
		 * @param {string} nCardNumber
		 * @returns {Boolean}
		 */
		card_num: function( strCardNumber, settings) {
			// accept only spaces, digits and dashes
			if (/[^0-9 -]+/.test(strCardNumber))		
				return false;

			strCardNumber = strCardNumber.replace(/\D/g, "");			
			if(strCardNumber.length < settings.min_card_number_length || strCardNumber.length >  settings.max_card_number_length)
				return false;
						
			var nCheck = 0, nDigit = 0,	bEven = false;
	 
	  		for (var n = strCardNumber.length - 1; n >= 0 ; n--) {
	  			var cDigit = strCardNumber.charAt(n);
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
		 * @param {string} nExpDate Сдесть ожидаем дату в формате mm/yyyy
		 * @returns {Boolean}
		 */
		exp_date: function( strExpDate, settings ) {
			var date;
			try {
				date = $.datepicker.parseDate("dd/mm/yy", "01/" + strExpDate);
				date = new Date(new Date(date).setMonth(date.getMonth()+1));
			} 
			catch (e) {
				return false;
			}
			return date > (new Date());
		},
		/**
		 * проверка имени владельца карты
		 * @param {string} strNameOnCard
		 * @returns {Boolean}
		 */
		name_on_card: function( strNameOnCard, settings ) {
			// accept only spaces, digits and dashes
			if (/[^A-Za-z -]+/.test(strNameOnCard))		
				return false;

			strNameOnCard = strNameOnCard.replace(/[^A-Za-z -]/g, "");			
			if(strNameOnCard.length < settings.min_name_on_card_length || strNameOnCard.length >  settings.max_name_on_card_length)
				return false;
			
	  		return true;	
		},
		/**
		 * проверка cvc карты
		 * @param {string} nCardCvc
		 * @returns {Boolean}
		 */
		card_cvc: function( strCardCvc, settings ) {
			if (/[^0-9]+/.test(strCardCvc))		
				return false;
			
			strCardCvc = strCardCvc.replace(/\D/g, "");
			if(strCardCvc.length < settings.min_card_cvc_length || strCardCvc.length >  settings.max_card_cvc_length)
				return false;
			
			return true;
		},
		/**
		 * 
		 * @param {string} strSmsCode
		 * @returns {Boolean}
		 */
		sms_code: function( strSmsCode, settings ) {
			return (/[0-9]{6}/.test(strSmsCode));		
		}
	};	
	var handlers = {
		card_num_fields: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var nSwitchToField = undefined;
			this.value = this.value.replace(/[^0-9]/g, "");
			
			var nFieldNumber = $(this).attr('name').replace('card_num_','');
			if(this.value.length >= 4 && (
					nFieldNumber === '1' 
					|| nFieldNumber === '2' 
					|| nFieldNumber === '3'))
				nSwitchToField = parseInt(nFieldNumber)+1;
			else if(this.value.length <= 0 && (
					nFieldNumber === '2' 
					|| nFieldNumber === '3' 
					|| nFieldNumber === '4'))
				nSwitchToField = parseInt(nFieldNumber)-1;
			
			//
			var strCardNum = '';
			for(var n in fields.card_num_fields) {
				if(parseInt(fields.card_num_fields[n].attr('name').replace('card_num_','')) === nSwitchToField)
					fields.card_num_fields[n].focus();
				value = fields.card_num_fields[n].val();
				strCardNum = strCardNum + value;  
			}
			
			if(strCardNum.length >= settings.min_card_number_length && strCardNum.length <= settings.max_card_number_length)
				if(validators.card_num( strCardNum , settings)) ok_seter.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);					
			else nothing_seter.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		card_num: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var value = this.value = this.value.replace(/[^0-9 -]/g, "");
			
			if(value.length >= settings.min_card_number_length && value.length <= settings.max_card_number_length)
				if(validators.card_num( value , settings)) ok_seter.card_num.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.card_num.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
			else 
				nothing_seter.card_num.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		exp_date_fields: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var bSwitchField = false;
			if(fields.exp_date_type === 'input'){
				this.value = this.value.replace(/[^0-9]/g, "");
			
				if($(this).attr('name') === "exp_month" && this.value.length >= 2)
					bSwitchField = true;
			}
			
			var strExpDate = '';
			for(var n in fields.exp_date_fields) {
				if(fields.exp_date_type === 'input' && bSwitchField
						&& fields.exp_date_fields[n].attr('name') !== 'exp_year')
					fields.exp_date_fields[n].focus();
				value = fields.exp_date_fields[n].val();
				strExpDate = strExpDate === '' ? value : strExpDate + '/' + value.substring(2,4);  
			}
			
			if(strExpDate.length >= 5)
				if(validators.exp_date( strExpDate , settings)) ok_seter.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
			else nothing_seter.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		exp_date: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var value = this.value = this.value.replace(/[^0-9 /-]/g, "");
		
			value = value.replace(" -", "/");
			if(value.length >= 5)
				if(validators.name_on_card( value , settings)) ok_seter.exp_date.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.exp_date.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
			else nothing_seter.exp_date.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		name_on_card: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var value = this.value = this.value.replace(/[^A-Za-z -]/g, "");
			
			if(value.length >= settings.min_name_on_card_length && value.length <= settings.max_name_on_card_length)
				if(validators.name_on_card( value , settings)) ok_seter.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
			else nothing_seter.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		card_cvc: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var value = this.value = this.value.replace(/\D/g, "");
			
			if(value.length >= settings.min_card_cvc_length && value.length <= settings.max_card_cvc_length)
				if(validators.card_cvc( value , settings)) ok_seter.card_cvc.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
				else error_seter.card_cvc.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
			else nothing_seter.card_cvc.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		},
		sms_code: function(fields, validators, settings, ok_seter, error_seter, nothing_seter) {
			var value = this.value = this.value.replace(/\D/g, ""),
			
			value = value.replace(/\D/g, "");
			fields.sms_code.val(value);
			
			if(value.length == SMS_CODE_LENGTH)
				if(validators.sms_code( value, settings )) ok_seter.sms_code.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);	
				else error_seter.sms_code.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
			else nothing_seter.sms_code.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
		}
	};
	var repliers = {
		ok : function(reply) {
			if(typeof reply.hash_code !== 'undefined') fields.hash_code.val(reply.hash_code);
			
			if(reply.message){
				var data = this.data(PLUGIN_NAME);
				
				data['info_form'].addClass("field-ok").removeClass("field-error");
				fields.message.text(reply.message);
				forms.show_form.apply( this , [ID_INFO_FORM]);
			}
			return this;
		},
		submit : function(reply) {
			if(typeof reply.hash_code !== 'undefined') fields.hash_code.val(reply.hash_code);
			
			$('form', this).unbind('.'+PLUGIN_NAME)
				.attr({
					'action' : reply.handler, 
					'method' : 'POST'
				})
				.submit();
			return this;
		},
		reload : function(reply) {
			if(typeof reply.hash_code !== 'undefined') fields.hash_code.val(reply.hash_code);
			
//			if(!reply.message)
				location.reload();
			// На будущее, тут можно рассмотреть случай с отображением сообщения в модальном окошке
			// и последующего reload'а
			return this;
		},
		show_form : function(reply) {
			if(typeof reply.hash_code !== 'undefined') fields.hash_code.val(reply.hash_code);
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
				else if(Object.keys(fields.card_num_fields).length){
					for(var n in fields.card_num_fields) 
						arr[fields.card_num_fields[n].attr('name')] = fields.card_num_fields[n].val();
				}
				
				if(typeof fields.exp_date !== 'undefined') {
					arr.exp_date = fields.card_num.val();
				}
				else if(Object.keys(fields.exp_date_fields).length){
					for(var n in fields.exp_date_fields) 
						arr[fields.exp_date_fields[n].attr('name')] = fields.exp_date_fields[n].val();
				}
				
				if(fields.hash_code.val() !== '')
					arr.hash = fields.hash_code.val();
				
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
					error_seter.form.apply(this, [data, arr_fields.form, forms, fields, validators, settings, ok_seter, error_seter, nothing_seter]);

				if(arr_fields.card_num){
					if(typeof fields.card_num !== 'undefined') 
						error_seter.card_num.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
					else if(fields.card_num_fields.length)
						error_seter.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
				}
				
				if(arr_fields.card_cvc)
					error_seter.card_cvc.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
				
				if(arr_fields.exp_date){
					if(typeof fields.exp_date !== 'undefined') 
						error_seter.exp_date.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
					else if(fields.exp_date_fields.length)
						error_seter.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
				}
				
				if(arr_fields.name_on_card)
					error_seter.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
	
				if(arr_fields.sms_code)
					error_seter.sms_code.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
					
			}
	};

	var methods = {
		
		init : function( override_options ) {
			/*
			 * Совмещаем настройки
			 */
			settings = $.extend( default_settings, override_options);
			if(Object.keys(settings.ok_seter).length > 0)
				for(var strFunctionName in settings.ok_seter)
					if(typeof settings.ok_seter[strFunctionName] === 'function' && typeof ok_seter[strFunctionName] === 'function')
						ok_seter[strFunctionName] = settings.ok_seter[strFunctionName];
			if(Object.keys(settings.error_seter).length > 0)
				for(var strFunctionName in settings.error_seter)
					if(typeof settings.error_seter[strFunctionName] === 'function' && typeof error_seter[strFunctionName] === 'function')
						error_seter[strFunctionName] = settings.error_seter[strFunctionName];
			if(Object.keys(settings.nothing_seter).length > 0)
				for(var strFunctionName in settings.nothing_seter)
					if(typeof settings.nothing_seter[strFunctionName] === 'function' && typeof nothing_seter[strFunctionName] === 'function')
						nothing_seter[strFunctionName] = settings.nothing_seter[strFunctionName];
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
							settings.accepted_card_brands[n] === 'MAESTRO' || settings.accepted_card_brands[n] === 'VISA ELECTRON' ||
							settings.accepted_card_brands[n] === 'DISCOVER') {	
							min_card_number_length = min_card_number_length > 16 || typeof min_card_number_length == 'undefined' ? 16 : min_card_number_length;
							max_card_number_length = max_card_number_length < 16 || typeof max_card_number_length == 'undefined' ? 16 : max_card_number_length;
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
							settings.accepted_card_brands[n] === 'DINERS CLUB'  || settings.accepted_card_brands[n] === 'DISCOVER') {
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
							settings.accepted_card_brands[n] === 'DINERS CLUB'  || settings.accepted_card_brands[n] === 'DISCOVER') {
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
				else if(settings.form_type === 'only_sms_chack_form')
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
			var 
				$objCardNum = $("input[name="+NAME_CARD_INPUT_FORM_CARD_NUM_FIELD+"]", $card_input_form),
				$objCardNum_1 = $("input[name="+NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD+"]", $card_input_form),
				$objCardNum_2 = $("input[name="+NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD+"]", $card_input_form),
				$objCardNum_3 = $("input[name="+NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD+"]", $card_input_form),
				$objCardNum_4 = $("input[name="+NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD+"]", $card_input_form);		
			if($objCardNum.size() > 0) {
				$objCardNum
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.card_num = $objCardNum;
			}
			else if($objCardNum_1.size() > 0 && $objCardNum_2.size() > 0 && $objCardNum_3.size() > 0 && $objCardNum_4.size() > 0) {
				$objCardNum_1
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				$objCardNum_2
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				$objCardNum_3
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				$objCardNum_4
					.attr({
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_num_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.card_num_fields = [$objCardNum_1, $objCardNum_2, $objCardNum_3, $objCardNum_4]
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для ввода номера банковской карты');

			var 
				$objExpDate = $("input[name="+NAME_CARD_INPUT_FORM_EXP_DATE_FIELD+"]", $card_input_form),
				$objInputExpMonth = $("input[name="+NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD+"]", $card_input_form),
				$objInputExpYear = $("input[name="+NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD+"]", $card_input_form),
				$objSelectExpMonth = $("select[name="+NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD+"]", $card_input_form),
				$objSelectExpYear = $("select[name="+NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD+"]", $card_input_form);	

			if($objExpDate.size() > 0) {
				$objExpDate.keyup(
						function (e) {
							e.preventDefault();
							handlers.exp_date.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.exp_date = $objExpDate;
				fields.exp_date_type = 'input';
			}
			else if($objInputExpMonth.size() > 0 && $objInputExpYear.size() > 0) {
				$objInputExpMonth.keyup(
						function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				$objInputExpYear.keyup(
						function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.exp_date_fields = [$objInputExpMonth, $objInputExpYear];
				fields.exp_date_type = 'input';
			}
			else if($objSelectExpMonth.size() > 0 && $objSelectExpYear.size() > 0) {
				$objSelectExpMonth.change(
						function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				$objSelectExpYear.change(
						function (e) {
							e.preventDefault();
							handlers.exp_date_fields.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.exp_date_fields = [$objSelectExpMonth, $objSelectExpYear];
				fields.exp_date_type = 'select';
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для даты истечения банковской карты');

			var $objNameOnCard = $("input[name="+NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD+"]", $card_input_form);
			if($objNameOnCard.size() > 0) {
				$objNameOnCard.keyup(
						function (e) {
							e.preventDefault();
							handlers.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						}).change(
						function (e) {
							e.preventDefault();
							handlers.name_on_card.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.name_on_card = $objNameOnCard;
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для имени владельца карты');

			var $objCardCvc = $("input[name="+NAME_CARD_INPUT_FORM_CARD_CVC_FIELD+"]", $card_input_form);
			if($objCardCvc.size() > 0) {
				$objCardCvc
					.attr({
						'maxlength' : settings.max_card_cvc_length,
						'autocomplete': 'off'
					})
					.keyup(
						function (e) {
							e.preventDefault();
							handlers.card_cvc.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
						});
				fields.card_cvc = $objCardCvc;
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для cvc карты');

			var	hash_field = $('<input>')
						.attr({
							'type': "text",
							'class': 'hash-code',
							'name': NAME_CARD_INPUT_FORM_HASH_CODE_FIELD,
						})
						.css({
							'display': "none"
						});

			//
			// Нажатие кнопки оплаты
			//
			$('form',$card_input_form)
					.append(hash_field)
					.bind('submit.'+ PLUGIN_NAME, function(e) {
						e.preventDefault();

//						forms.show_form.apply($card_input_form, [ID_CODE_INPUT_FORM])
						methods.check_card_data.apply( $card_input_form );
						return false;
					});

			var $code_input_form_hash_code_field = $('.hash-code' , $card_input_form)
			if($code_input_form_hash_code_field.size() > 0) {
				fields.hash_code = hash_field;
			}
			else
				console.log('Невозможно инициализировать форму, не удается определить поля для хранения хеша');

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
				code_info_row = $('<div></div>').text('Просим вас ввести код, высланный в СМС сообщение'),
				code_info2_row = $('<div></div>').text('Если код не пришёл на ваш телефон, вы сможете перевыслать его через '+SMS_CODE_REFRESH_TIMEOUT+' секунд'),
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
						.attr({ 'class': "refresh_button" , 'title': "Перевыслать код"})
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
							handlers.sms_code.apply(this, [fields, validators, settings, ok_seter, error_seter, nothing_seter]);
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


		get_action: function() {
			return this.each(function(){
				var  
					$loader_form = $(this),
					data = $loader_form.data(PLUGIN_NAME),
					
					arrLoaderFromParams = forms.get_card_data.apply( $loader_form , [ID_LOADER_FORM] );
				
				arrLoaderFromParams.action = 'get_action';
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
//						console.log(data);
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
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Метод с именем ' +  method + ' не существует для jQuery.card_payment_form' );
		}    

	};

})( jQuery );
